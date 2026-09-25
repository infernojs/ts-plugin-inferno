import {
    BinaryExpression,
    Expression,
    getLineAndCharacterOfPosition,
    getSourceMapRange,
    idText,
    Identifier,
    JsxAttribute,
    JsxAttributeLike,
    JsxChild,
    JsxElement,
    JsxExpression,
    JsxFragment,
    JsxSelfClosingElement,
    JsxText,
    Node,
    NodeArray,
    ObjectLiteralElementLike,
    ParenthesizedExpression,
    ScriptTarget,
    setSourceMapRange,
    SourceMapRange,
    SourceFile,
    SyntaxKind,
    isSpreadElement,
    TransformationContext,
    Transformer,
    visitEachChild,
    visitNode,
    VisitResult
} from "typescript";
import * as ts from "typescript";
import {ChildFlags, VNodeFlags} from './utils/flags'
import isComponent from './utils/isComponent'
import isValidIdentifier from './utils/isValidIdentifier'
import isFragment from './utils/isFragment'
import createAssignHelper from './utils/createAssignHelper'
import getValue from './utils/getValue'
import decodeEntities from './utils/decodeEntities'
import mayHaveSideEffects from './utils/mayHaveSideEffects'
import svgAttributes from './utils/svgAttributes'
import attributeTransforms from './utils/attributeTransforms'
import lowerCaseAttributes from './utils/lowerCaseAttributes'
import isNodeNull from './utils/isNodeNull'
import handleWhiteSpace from './utils/handleWhiteSpace'
import codeFrame from './utils/codeFrame'
import vNodeTypes from './utils/vNodeTypes'
import {updateSourceFile} from './updateSourceFile'

// All special attributes
let PROP_HasKeyedChildren = '$HasKeyedChildren'
let PROP_HasNonKeyedChildren = '$HasNonKeyedChildren'
let PROP_VNODE_CHILDREN = '$HasVNodeChildren'
let PROP_TEXT_CHILDREN = '$HasTextChildren'
let PROP_ReCreate = '$ReCreate'
let PROP_ChildFlag = '$ChildFlag'
let PROP_Flags = '$Flags'

// Child flags in the order they take precedence over each other
const CHILD_FLAG_PROPS = [PROP_ChildFlag, PROP_HasKeyedChildren, PROP_HasNonKeyedChildren, PROP_TEXT_CHILDREN, PROP_VNODE_CHILDREN]
const USELESS_FLAGS_LEVELS = ['warn', 'error', 'off']

const TYPE_ELEMENT = 0
const TYPE_COMPONENT = 1
const TYPE_FRAGMENT = 2

export const POSSIBLE_IMPORTS_TO_ADD = ['createFragment', 'createVNode', 'createComponentVNode', 'createTextVNode', 'normalizeProps'];

function getPropertyName(astProp: any) {
    // TypeScript@5.1 added in ts.JsxNamespacedName directly
    // Following code makes the plugin compatible with TS5.1 and TS5.2
    if (astProp.name.namespace === undefined) {
        return astProp.name.text
    }
    return `${astProp.name.namespace.text}:${astProp.name.name.text}`
}

/*
 * TypeScript marks every node whose subtree contains JSX with this transform flag, and its own JSX transform uses it
 * to skip the rest. The flag is not part of the public API, so without it every node is visited.
 */
const CONTAINS_JSX: number | undefined = (<any>ts).TransformFlags?.ContainsJsx

// Own properties only, so that names like constructor or __proto__ do not match Object.prototype
function hasOwn(object: object, key: string) {
    return Object.prototype.hasOwnProperty.call(object, key)
}

export interface Options {
    /**
     * What to do about special flags that cannot change the compiled output, e.g. a child flag on static children:
     * "warn" (default) prints a warning with console.warn, "error" throws and "off" does nothing.
     */
    uselessFlags?: 'warn' | 'error' | 'off'
}

export default (options?: Options) => {
    const uselessFlags = options?.uselessFlags

    // Checked here so that a mistyped level fails when the plugin is configured instead of being ignored
    if (uselessFlags !== undefined && !USELESS_FLAGS_LEVELS.includes(uselessFlags)) {
        throw new Error('ts-plugin-inferno: the uselessFlags option must be "warn", "error" or "off", got ' + JSON.stringify(uselessFlags) + '.')
    }

    return (context: TransformationContext): Transformer<SourceFile> => {
        const {factory} = context;
        const compilerOptions = context.getCompilerOptions()
        // Source map ranges are only read when a source map is written, and each one allocates an emit node
        const sourceMaps = Boolean(compilerOptions.sourceMap || compilerOptions.inlineSourceMap)
        let currentSourceFile: SourceFile
        // The helper identifiers of the current file, created when a helper is first used
        let helperIdentifiers: Record<string, Identifier>

        return ((sourceFile: SourceFile) => {
            if (sourceFile.isDeclarationFile) {
                return sourceFile
            }

            currentSourceFile = sourceFile
            helperIdentifiers = {}
            context['createFragment'] = false
            context['createVNode'] = false
            context['createComponentVNode'] = false
            context['createTextVNode'] = false
            context['normalizeProps'] = false

            const newSourceFile = visitEachChild(sourceFile, visitor, context)

            return updateSourceFile(newSourceFile, context, POSSIBLE_IMPORTS_TO_ADD.filter(name => context[name]))
        })

        // Points the error at the node like tsc diagnostics do, e.g. "file.tsx(3,5): message"
        function createError(node: Node, message: string) {
            if (node.pos < 0) {
                return new Error(message)
            }
            const {line, character} = getLineAndCharacterOfPosition(currentSourceFile, node.getStart(currentSourceFile))

            return new Error(`${currentSourceFile.fileName}(${line + 1},${character + 1}): ${message}`)
        }

        // Like createError, with the code around the node. JSX built by other transformers has no code to show.
        function withCodeFrame(node: Node, message: string) {
            if (node.pos < 0) {
                return `${currentSourceFile.fileName}: ${message}`
            }
            const start = node.getStart(currentSourceFile)
            const {line, character} = getLineAndCharacterOfPosition(currentSourceFile, start)

            return `${currentSourceFile.fileName}(${line + 1},${character + 1}): ${message}\n${codeFrame(currentSourceFile, start, node.end)}`
        }

        /*
         * Adds a prop to props and rejects an attribute that ends up as the same prop as an earlier one, e.g. htmlFor
         * and for. outputNames holds pairs of a prop name and the attribute that set it, or is null for a single attribute.
         */
        function addProp(props: ObjectLiteralElementLike[], outputNames: string[] | null, astProp, attributeName: string, outputName: string) {
            if (outputNames !== null) {
                for (let i = 0; i < outputNames.length; i += 2) {
                    if (outputNames[i] === outputName) {
                        throw createError(astProp, outputNames[i + 1] + ' and ' + attributeName + ' both set the ' + outputName + ' prop. Remove one of them.')
                    }
                }
                outputNames.push(outputName, attributeName)
            }

            const prop = createPropertyAssignment(outputName, getValue(astProp.initializer, visitor, factory))

            props.push(prop)
            return prop
        }

        function createPropertyAssignment(name: string, value: Expression) {
            return factory.createPropertyAssignment(
                // A non-computed __proto__ key would set the prototype of the props object instead of creating a prop
                name === '__proto__' ? factory.createComputedPropertyName(factory.createStringLiteral(name)) : factory.createStringLiteral(name),
                value
            )
        }

        // Removes the children prop added by getVNodeProps from the props objects and returns its value
        function removeChildrenProp(vProps) {
            if (vProps.childrenProp) {
                for (let i = 0; i < vProps.props.length; i++) {
                    const props = vProps.props[i]
                    const index = props.kind === SyntaxKind.ObjectLiteralExpression ? props.properties.indexOf(vProps.childrenProp) : -1

                    if (index !== -1) {
                        props.properties.splice(index, 1)

                        // Drop an object left empty after a spread, the first one is kept as the Object.assign target
                        if (i > 0 && props.properties.length === 0) {
                            vProps.props.splice(i, 1)
                        }
                        return vProps.childrenProp.initializer
                    }
                }
            }
            return null
        }

        // A children prop replaced by JSX children is still evaluated before them, like in React's JSX transform
        function withOverridden(overridden: Expression | null, value: Expression) {
            const expressions = []
            const stack = overridden ? [overridden] : []

            while (stack.length) {
                const node = stack.shift()

                if (node.kind === SyntaxKind.ParenthesizedExpression) {
                    stack.unshift((node as ParenthesizedExpression).expression)
                } else if (node.kind === SyntaxKind.BinaryExpression && (node as BinaryExpression).operatorToken.kind === SyntaxKind.CommaToken) {
                    stack.unshift((node as BinaryExpression).left, (node as BinaryExpression).right)
                } else if (mayHaveSideEffects(node)) {
                    expressions.push(node)
                }
            }

            return expressions.concat(value).reduce((left, right) => factory.createComma(left, right))
        }

        function isJsx(node) {
            while (
                node.kind === SyntaxKind.ParenthesizedExpression ||
                node.kind === SyntaxKind.PartiallyEmittedExpression ||
                node.kind === SyntaxKind.AsExpression ||
                node.kind === SyntaxKind.SatisfiesExpression ||
                node.kind === SyntaxKind.NonNullExpression ||
                node.kind === SyntaxKind.TypeAssertionExpression
            ) {
                node = node.expression
            }
            return node.kind === SyntaxKind.JsxElement || node.kind === SyntaxKind.JsxSelfClosingElement || node.kind === SyntaxKind.JsxFragment
        }

        /*
         * ES5 has no array spread and the plugin runs after TypeScript's own transforms, so spread children are
         * downleveled here: [a, ...b] becomes [a].concat(Array.prototype.slice.call(b)), which copies b like
         * TypeScript's __spreadArray does without downlevelIteration.
         */
        function downlevelSpreadChildren(children) {
            const target = context.getCompilerOptions().target

            if (
                target === undefined || target >= ScriptTarget.ES2015 ||
                !children || children.kind !== SyntaxKind.ArrayLiteralExpression ||
                !children.elements.some(isSpreadElement)
            ) {
                return children
            }
            const parts: Expression[] = []
            let elements: Expression[] = []

            for (const element of children.elements) {
                if (isSpreadElement(element)) {
                    if (elements.length) {
                        parts.push(factory.createArrayLiteralExpression(elements))
                        elements = []
                    }
                    parts.push(factory.createCallExpression(
                        factory.createPropertyAccessExpression(
                            factory.createPropertyAccessExpression(
                                factory.createPropertyAccessExpression(factory.createIdentifier('Array'), 'prototype'),
                                'slice'
                            ),
                            'call'
                        ),
                        undefined,
                        [element.expression]
                    ))
                } else {
                    elements.push(element)
                }
            }
            if (elements.length) {
                parts.push(factory.createArrayLiteralExpression(elements))
            }

            const [first, ...rest] = parts

            return rest.length ? factory.createCallExpression(factory.createPropertyAccessExpression(first, 'concat'), undefined, rest) : first
        }

        function getImportSpecifier(name: 'createFragment' | 'createVNode' | 'createComponentVNode' | 'createTextVNode' | 'normalizeProps'): Expression {
            return helperIdentifiers[name] || (helperIdentifiers[name] = factory.createIdentifier(name))
        }

        function withSourceMapRange<T extends Node>(node: T, range: SourceMapRange): T {
            return sourceMaps ? setSourceMapRange(node, range) : node
        }

        function visitor(node: Node): VisitResult<Node> {
            switch (node.kind) {
                case SyntaxKind.JsxFragment:
                    return withSourceMapRange(createFragment((<JsxFragment>node).children), node)

                case SyntaxKind.JsxElement:
                    return createVNode(
                        <JsxElement>node,
                        (<JsxElement>node).children
                    )

                case SyntaxKind.JsxSelfClosingElement:
                    return createVNode(<JsxSelfClosingElement>node)

                case SyntaxKind.JsxText:
                    // The text property instead of the source text, so JSX built by other transformers works too
                    let text = handleWhiteSpace((<JsxText>node).text)

                    if (text !== '') {
                        // Whitespace is collapsed first, so encoded characters like &#10; are kept like in TypeScript's JSX emit
                        return withSourceMapRange(factory.createStringLiteral(decodeEntities(text)), node)
                    }
                    break

                case SyntaxKind.JsxExpression:
                    if ((<JsxExpression>node).expression) {
                        const expression = visitNode((<JsxExpression>node).expression, visitor) as Expression

                        // A spread child, e.g. <div>{...children}</div>, is spread into the children array
                        return (<JsxExpression>node).dotDotDotToken ? factory.createSpreadElement(expression) : expression
                    }
                    break

                default:
                    // Subtrees without JSX have nothing to compile, see CONTAINS_JSX
                    if (CONTAINS_JSX !== undefined && ((<any>node).transformFlags & CONTAINS_JSX) === 0) {
                        return node
                    }
                    return visitEachChild(node, visitor, context)
            }
        }

        function addCreateTextVNodeCalls(vChildren) {
            // When normalization is not needed we need to manually compile text into vNodes
            for (let j = 0; j < vChildren.elements.length; j++) {
                const aChild = vChildren.elements[j];

                if (aChild.kind === SyntaxKind.StringLiteral) {
                    vChildren.elements[j] = createTextVNodeCall(aChild)
                }
            }

            return vChildren
        }

        /*
         * A single child is a string, or any expression that $HasTextChildren declares as text on a Fragment.
         * JSX stays a vNode whatever the flag says; isJsxChild tells, as the JSX is already compiled here.
         */
        function transformTextNodes(vChildren, isJsxChild: boolean) {
            if (vChildren.kind === SyntaxKind.ArrayLiteralExpression) {
                return addCreateTextVNodeCalls(vChildren)
            }
            if (isJsxChild) {
                return vChildren
            }
            return createTextVNodeCall(vChildren)
        }

        // createTextVNode("text") maps to the JSX text in source maps, like the string literal it wraps.
        // The import is added with the first call, so that children without text do not import createTextVNode.
        function createTextVNodeCall(text: Expression) {
            context['createTextVNode'] = true

            const call = factory.createCallExpression(getImportSpecifier('createTextVNode'), [], [text])

            return sourceMaps ? setSourceMapRange(call, getSourceMapRange(text)) : call
        }

        function createFragmentVNodeArgs(children, childFlags, key?) {
            const args = [];
            const hasChildren = !isNodeNull(children);
            const hasChildFlags =
                hasChildren && childFlags !== ChildFlags.HasInvalidChildren;
            const hasKey = !isNodeNull(key);

            if (hasChildren) {
                if (
                    // A $ChildFlag expression declares the shape of the children at runtime, they are passed as written
                    typeof childFlags !== 'number' ||
                    childFlags === ChildFlags.HasVNodeChildren ||
                    childFlags === ChildFlags.HasNonKeyedChildren ||
                    childFlags === ChildFlags.HasKeyedChildren ||
                    childFlags === ChildFlags.UnknownChildren ||
                    children.kind === SyntaxKind.ArrayLiteralExpression
                ) {
                    args.push(children)
                } else {
                    args.push(factory.createArrayLiteralExpression([children]))
                }
            } else if (hasChildFlags || hasKey) {
                args.push(factory.createNull())
            }

            if (hasChildFlags) {
                args.push(
                    typeof childFlags === 'number'
                        ? factory.createNumericLiteral(childFlags + '')
                        : childFlags
                )
            } else if (hasKey) {
                args.push(factory.createNumericLiteral(ChildFlags.HasInvalidChildren + ''))
            }

            if (hasKey) {
                args.push(key)
            }

            return args
        }

        function createFragment(children?: NodeArray<JsxChild>) {
            let childrenResults = getVNodeChildren(children)
            let vChildren = childrenResults.children
            let childFlags

            if (!childrenResults.requiresNormalization) {
                if (childrenResults.parentCanBeKeyed) {
                    childFlags = ChildFlags.HasKeyedChildren
                } else {
                    childFlags = ChildFlags.HasNonKeyedChildren
                }
                if (childrenResults.hasSingleChild) {
                    vChildren = factory.createArrayLiteralExpression([vChildren])
                }
            } else {
                childFlags = ChildFlags.UnknownChildren
            }

            if (vChildren && childrenResults.foundText) {
                vChildren = transformTextNodes(vChildren, false)
            }

            vChildren = downlevelSpreadChildren(vChildren)
            context['createFragment'] = true

            return factory.createCallExpression(
                getImportSpecifier('createFragment'),
                [],
                createFragmentVNodeArgs(vChildren, childFlags)
            )
        }

        function createVNode(
            node: JsxElement | JsxSelfClosingElement,
            children?: NodeArray<JsxChild>
        ) {
            let vType
            let vProps
            let vChildren
            let childrenResults: any = {}
            let text

            if (children) {
                let openingElement = (<JsxElement>node).openingElement
                vType = getVNodeType(openingElement.tagName)
                vProps = getVNodeProps(
                    openingElement.attributes.properties,
                    vType.vNodeType === TYPE_COMPONENT
                )
                childrenResults = getVNodeChildren(children)
                vChildren = childrenResults.children
            } else {
                vType = getVNodeType((<JsxSelfClosingElement>node).tagName)
                vProps = getVNodeProps(
                    (<JsxSelfClosingElement>node).attributes.properties,
                    vType.vNodeType === TYPE_COMPONENT
                )
            }

            if (vProps.flagProps !== null && uselessFlags !== 'off') {
                checkFlags(vProps.flagProps, vType.vNodeType, childrenResults, vProps.propChildren)
            }

            let childFlags = ChildFlags.HasInvalidChildren
            let flags = vType.flags
            let overriddenChildren = null
            // Whether a single child is JSX, which is compiled already and stays a vNode whatever the child flags say
            let isJsxChild = childrenResults.foundVNode === true
            // A single Fragment child that $HasTextChildren declares as text, which goes in an array like a static one
            let singleTextChild = false

            if (vProps.hasReCreateFlag) {
                flags = flags | VNodeFlags.ReCreate
            }
            if (vProps.contentEditable) {
                flags = flags | VNodeFlags.ContentEditable
            }

            if (vType.vNodeType === TYPE_COMPONENT) {
                if (vChildren) {
                    if (
                        !(
                            vChildren.kind === SyntaxKind.ArrayLiteralExpression &&
                            vChildren.elements.length === 0
                        )
                    ) {
                        // JSX children replace the children prop
                        const childrenProp = createPropertyAssignment('children', withOverridden(removeChildrenProp(vProps), downlevelSpreadChildren(vChildren)))
                        const lastProps = vProps.props[vProps.props.length - 1]

                        // They are merged last, so they win over a children key of a spread like in React
                        if (lastProps && !(vProps.spreads !== null && vProps.spreads.includes(lastProps))) {
                            lastProps.properties.push(childrenProp)
                        } else {
                            vProps.props.push(factory.createObjectLiteralExpression([childrenProp]))
                        }
                    }
                    vChildren = null
                }
            } else {
                // The children prop is used as children only when there are no JSX children to replace it
                const usesPropChildren = vProps.propChildren && (
                    !vChildren ||
                    (vChildren.kind === SyntaxKind.ArrayLiteralExpression && vChildren.elements.length === 0)
                )

                if (usesPropChildren) {
                    if (vProps.propChildren.kind === SyntaxKind.StringLiteral) {
                        text = decodeEntities(handleWhiteSpace(vProps.propChildren.text))
                        if (text !== '') {
                            // Text like a JSX text child: a Fragment gets it as a text vNode in an array
                            childrenResults.foundText = true
                            childrenResults.hasSingleChild = true
                            vChildren = factory.createStringLiteral(text)
                        }
                    } else if (
                        vProps.propChildren.kind === SyntaxKind.JsxExpression &&
                        (!vProps.propChildren.expression || vProps.propChildren.expression.kind === SyntaxKind.NullKeyword)
                    ) {
                        vChildren = null
                        childFlags = ChildFlags.HasInvalidChildren
                    } else {
                        // children={expression}, or children=<element /> without braces
                        const value = vProps.propChildren.kind === SyntaxKind.JsxExpression ? vProps.propChildren.expression : vProps.propChildren

                        // Compiled once with the other props, so JSX in it is not visited again
                        vChildren = vProps.childrenProp.initializer
                        isJsxChild = isJsx(value)
                        // Only JSX is known to be a single vNode, other values are normalized at runtime like {expression} children
                        childFlags = vType.vNodeType !== TYPE_FRAGMENT && (isJsxChild || vProps.childrenKnown)
                            ? ChildFlags.HasVNodeChildren
                            : ChildFlags.UnknownChildren
                    }
                }
                if (
                    (childrenResults && !childrenResults.requiresNormalization) ||
                    vProps.childrenKnown
                ) {
                    if (vProps.hasKeyedChildren || childrenResults.parentCanBeKeyed) {
                        childFlags = ChildFlags.HasKeyedChildren
                    } else if (
                        vProps.hasNonKeyedChildren ||
                        childrenResults.parentCanBeNonKeyed
                    ) {
                        childFlags = ChildFlags.HasNonKeyedChildren
                    } else if (
                        vProps.hasTextChildren ||
                        (childrenResults.foundText && childrenResults.hasSingleChild)
                    ) {
                        childrenResults.foundText = vType.vNodeType === TYPE_FRAGMENT
                        childFlags =
                            vType.vNodeType === TYPE_FRAGMENT
                                ? ChildFlags.HasNonKeyedChildren
                                : ChildFlags.HasTextChildren
                        singleTextChild = vType.vNodeType === TYPE_FRAGMENT && !isNodeNull(vChildren) && vChildren.kind !== SyntaxKind.ArrayLiteralExpression
                    } else if (childrenResults.hasSingleChild) {
                        // A static Fragment child is put in an array below, a dynamic one declared by $HasVNodeChildren is passed as is
                        childFlags =
                            vType.vNodeType === TYPE_FRAGMENT && !childrenResults.requiresNormalization
                                ? ChildFlags.HasNonKeyedChildren
                                : ChildFlags.HasVNodeChildren
                    } else if (vProps.childrenKnown && !isNodeNull(vChildren) && vChildren.kind === SyntaxKind.ArrayLiteralExpression) {
                        // Several children or a spread child that $HasVNodeChildren declares as vNodes. Without a child flag
                        // Inferno would use HasInvalidChildren and render none of them.
                        childFlags = ChildFlags.HasNonKeyedChildren
                    }
                } else {
                    if (vProps.hasKeyedChildren) {
                        childFlags = ChildFlags.HasKeyedChildren
                    } else if (vProps.hasNonKeyedChildren) {
                        childFlags = ChildFlags.HasNonKeyedChildren
                    }
                }

                // Elements get children as an argument, never as a prop
                const childrenPropValue = removeChildrenProp(vProps)

                if (!usesPropChildren) {
                    overriddenChildren = childrenPropValue
                }
            }

            if (vChildren && childrenResults.foundText) {
                vChildren = transformTextNodes(vChildren, isJsxChild)
            }

            vChildren = downlevelSpreadChildren(vChildren)

            if (overriddenChildren) {
                vChildren = withOverridden(overriddenChildren, vChildren)
            }

            let willNormalizeChildren =
                !(vType.vNodeType === TYPE_COMPONENT) &&
                childrenResults &&
                childrenResults.requiresNormalization &&
                !vProps.childrenKnown

            if (vProps.childFlags) {
                // If $ChildFlag is provided it is runtime dependant
                childFlags = vProps.childFlags
            } else {
                childFlags = willNormalizeChildren
                    ? ChildFlags.UnknownChildren
                    : childFlags
            }

            // Delete empty objects
            if (
                vProps.props.length === 1 &&
                vProps.props[0] &&
                !vProps.props[0].properties.length
            ) {
                vProps.props.splice(0, 1)
            }

            let createVNodeCall

            if (vType.vNodeType === TYPE_COMPONENT) {
                createVNodeCall = factory.createCallExpression(
                    getImportSpecifier('createComponentVNode'),
                    [],
                    createComponentVNodeArgs(
                        vProps.flagsOverride || flags,
                        vType.type,
                        vProps.props,
                        vProps.key,
                        vProps.ref
                    )
                )
                context['createComponentVNode'] = true
            } else if (vType.vNodeType === TYPE_ELEMENT) {
                createVNodeCall = factory.createCallExpression(
                    getImportSpecifier('createVNode'),
                    [],
                    createVNodeArgs(
                        vProps.flagsOverride || flags,
                        vType.type,
                        vProps.className,
                        vChildren,
                        childFlags,
                        vProps.props,
                        vProps.key,
                        vProps.ref,
                        context
                    )
                )
                context['createVNode'] = true
            } else if (vType.vNodeType === TYPE_FRAGMENT) {
                if (
                    singleTextChild ||
                    (!childrenResults.requiresNormalization && childrenResults.hasSingleChild)
                ) {
                    vChildren = factory.createArrayLiteralExpression([vChildren])
                }
                createVNodeCall = factory.createCallExpression(
                    getImportSpecifier('createFragment'),
                    [],
                    createFragmentVNodeArgs(vChildren, childFlags, vProps.key)
                )
                context['createFragment'] = true
            }

            // The generated calls map to the JSX in source maps, their arguments are synthesized
            withSourceMapRange(createVNodeCall, node)

            // NormalizeProps will normalizeChildren too
            if (vProps.needsNormalization) {
                context['normalizeProps'] = true
                createVNodeCall = withSourceMapRange(
                    factory.createCallExpression(getImportSpecifier('normalizeProps'), [], [createVNodeCall]),
                    node
                )
            }

            return createVNodeCall
        }

        function getVNodeType(type) {
            let vNodeType
            let flags

            if (type.kind === SyntaxKind.JsxNamespacedName) {
                throw createError(type, `Namespace tags like <${idText(type.namespace)}:${idText(type.name)}> are not supported.`)
            }

            if (type.kind === SyntaxKind.PropertyAccessExpression) {
                let object = type.expression

                while (object.kind === SyntaxKind.PropertyAccessExpression) {
                    object = object.expression
                }
                // The object of a member expression tag must be a variable, which a-b in <a-b.c /> cannot be
                if (object.kind === SyntaxKind.Identifier && !isValidIdentifier(idText(object))) {
                    throw createError(object, `${idText(object)} is not a valid variable name for a member expression tag.`)
                }

                // A member expression like <a.b> or <this.foo> references a component whatever its casing
                if (type.name.text === 'Fragment') {
                    vNodeType = TYPE_FRAGMENT
                } else {
                    vNodeType = TYPE_COMPONENT
                    flags = VNodeFlags.ComponentUnknown
                }
            } else {
                // Read from the node instead of the source text, so JSX built by other transformers works too
                const text = type.kind === SyntaxKind.ThisKeyword ? 'this' : idText(type)

                if (isFragment(text)) {
                    vNodeType = TYPE_FRAGMENT
                } else if (isComponent(text) && isValidIdentifier(text)) {
                    // Names that are not identifiers, like Foo-bar, can only be elements
                    vNodeType = TYPE_COMPONENT
                    flags = VNodeFlags.ComponentUnknown
                } else {
                    vNodeType = TYPE_ELEMENT
                    type = factory.createStringLiteral(text)
                    flags = hasOwn(vNodeTypes, text) ? vNodeTypes[text] : VNodeFlags.HtmlElement
                }
            }

            return {
                type: type,
                vNodeType: vNodeType,
                flags: flags,
            }
        }

        function getVNodeProps(astProps: NodeArray<JsxAttributeLike>, isComponent) {
            let key = null
            let ref = null
            let hooks = null
            let className = null
            let hasClassName = false
            let hasTextChildren = false
            let hasKeyedChildren = false
            let hasNonKeyedChildren = false
            let childrenKnown = false
            let needsNormalization = false
            let hasReCreateFlag = false
            let flagsOverride = null
            let propChildren = null
            let childrenProp = null
            let childFlags = null
            let contentEditable = false
            // The special flag attributes, for the useless flag checks
            let flagProps: JsxAttribute[] | null = null
            let assignArgs = []
            let spreads = null
            let propsPropertyAssignments = []
            let objectLiteralExpressionAdded = false
            // Duplicates need two attributes, which most elements do not have, so the lists are only made for those
            const seenNames: string[] | null = astProps.length > 1 ? [] : null
            const outputNames: string[] | null = astProps.length > 1 ? [] : null

            for (let i = 0; i < astProps.length; i++) {
                let astProp = astProps[i]
                let initializer;

                if (astProp.kind === SyntaxKind.JsxSpreadAttribute) {
                    if (propsPropertyAssignments.length) {
                        assignArgs.push(factory.createObjectLiteralExpression([...propsPropertyAssignments]))

                        propsPropertyAssignments = []
                    }

                    needsNormalization = true

                    if (!objectLiteralExpressionAdded) {
                        assignArgs.unshift(factory.createObjectLiteralExpression())
                        objectLiteralExpressionAdded = true
                    }

                    // Visited like attribute values, so JSX in the spread expression is compiled too
                    const expression = visitNode(astProp.expression, visitor) as Expression

                    assignArgs.push(expression)
                    if (spreads === null) {
                        spreads = []
                    }
                    spreads.push(expression)
                } else {
                    initializer = astProp.initializer
                    let propName = getPropertyName(astProp);

                    if (seenNames !== null) {
                        if (seenNames.includes(propName)) {
                            throw createError(astProp, 'Multiple ' + propName + ' props are not supported. Remove the duplicate ' + propName + ' prop.')
                        }
                        seenNames.push(propName)
                    }

                    if (
                        !isComponent &&
                        (propName === 'className' || propName === 'class')
                    ) {
                        if (hasClassName) {
                            throw createError(astProp, 'className and class both set the class name. Remove one of them.')
                        }
                        hasClassName = true
                        className = getValue(initializer, visitor, factory)
                    } else if (!isComponent && hasOwn(attributeTransforms, propName)) {
                        addProp(propsPropertyAssignments, outputNames, astProp, propName, attributeTransforms[propName])
                    } else if (!isComponent && lowerCaseAttributes.has(propName)) {
                        addProp(propsPropertyAssignments, outputNames, astProp, propName, propName.toLowerCase())
                    } else if (!isComponent && propName === 'onDoubleClick') {
                        addProp(propsPropertyAssignments, outputNames, astProp, propName, 'onDblClick')
                    } else if (isComponent && propName.startsWith('onComponent')) {
                        if (hooks === null) {
                            hooks = []
                        }
                        hooks.push(
                            factory.createPropertyAssignment(
                                factory.createStringLiteral(propName),
                                getValue(initializer, visitor, factory)
                            )
                        )
                    } else if (!isComponent && hasOwn(svgAttributes, propName)) {
                        // React compatibility for SVG Attributes
                        addProp(propsPropertyAssignments, outputNames, astProp, propName, svgAttributes[propName])
                    } else {
                        switch (propName) {
                            case 'hasKeyedChildren':
                            case 'hasNonKeyedChildren':
                                throw 'Inferno JSX plugin:\n' +
                                propName +
                                ' is deprecated use: ' +
                                '$' +
                                propName.charAt(0).toUpperCase() +
                                propName.slice(1)
                            case PROP_ChildFlag:
                                flagProps = addFlagProp(flagProps, astProp)
                                childrenKnown = true
                                childFlags = getFlagsValue(astProp, propName)
                                break
                            case PROP_VNODE_CHILDREN:
                                flagProps = addFlagProp(flagProps, astProp)
                                childrenKnown = true
                                break
                            case PROP_TEXT_CHILDREN:
                                flagProps = addFlagProp(flagProps, astProp)
                                childrenKnown = true
                                hasTextChildren = true
                                break
                            case PROP_HasNonKeyedChildren:
                                flagProps = addFlagProp(flagProps, astProp)
                                hasNonKeyedChildren = true
                                childrenKnown = true
                                break
                            case PROP_HasKeyedChildren:
                                flagProps = addFlagProp(flagProps, astProp)
                                hasKeyedChildren = true
                                childrenKnown = true
                                break
                            case 'ref':
                                ref = initializer ? getValue(initializer, visitor, factory) : null
                                break
                            case 'key':
                                if (!initializer) {
                                    throw createError(astProp, 'Please provide an explicit key value. Using "key" as a shorthand for "key={true}" is not allowed.')
                                }
                                key = getValue(initializer, visitor, factory)
                                break
                            case PROP_ReCreate:
                                flagProps = addFlagProp(flagProps, astProp)
                                hasReCreateFlag = true
                                break
                            case PROP_Flags:
                                flagProps = addFlagProp(flagProps, astProp)
                                // Replaces the flags of an element or a component, e.g. $Flags={VNodeFlags.InputElement}
                                flagsOverride = getFlagsValue(astProp, propName)
                                break
                            default:
                                // The length check first avoids a lowercased copy of every other prop name
                                if (propName.length === 15 && propName.toLowerCase() === 'contenteditable') {
                                    contentEditable = true
                                }
                                if (propName === 'children') {
                                    propChildren = astProp.initializer
                                    childrenProp = addProp(propsPropertyAssignments, outputNames, astProp, propName, propName)
                                } else {
                                    addProp(propsPropertyAssignments, outputNames, astProp, propName, propName)
                                }
                        }
                    }
                }
            }

            if (propsPropertyAssignments.length) {
                assignArgs.push(factory.createObjectLiteralExpression(propsPropertyAssignments))
            }

            // Component hooks are passed in the ref argument; a ref attribute is merged in first so that the hook
            // attributes win regardless of their position
            if (hooks !== null) {
                const hooksObject = factory.createObjectLiteralExpression(hooks)

                ref = ref ? createAssignHelper(context, [factory.createObjectLiteralExpression(), ref, hooksObject]) : hooksObject
            }

            return {
                props: assignArgs,
                spreads: spreads,
                key: key == null ? null : key,
                ref: ref == null ? null : ref,
                hasKeyedChildren: hasKeyedChildren,
                hasNonKeyedChildren: hasNonKeyedChildren,
                propChildren: propChildren,
                childrenProp: childrenProp,
                childrenKnown: childrenKnown,
                className: className == null ? null : className,
                childFlags: childFlags,
                hasReCreateFlag: hasReCreateFlag,
                flagsOverride: flagsOverride,
                needsNormalization: needsNormalization,
                contentEditable: contentEditable,
                hasTextChildren: hasTextChildren,
                flagProps: flagProps,
            }
        }

        /*
         * The value of $ChildFlag or $Flags, which is passed as the flags. A valueless flag would pass true, which
         * Inferno reads as flag 1: HasInvalidChildren drops the children, HtmlElement turns a component into an element.
         */
        function getFlagsValue(astProp: JsxAttribute, propName: string) {
            const initializer = astProp.initializer

            if (!initializer || (initializer.kind === SyntaxKind.JsxExpression && !initializer.expression)) {
                throw createError(astProp, 'Please provide an explicit ' + propName + ' value, e.g. ' + propName + '={flags}.')
            }
            return getValue(initializer, visitor, factory)
        }

        // The array is created with the first flag, as most elements have none
        function addFlagProp(flagProps: JsxAttribute[] | null, astProp: JsxAttribute) {
            if (flagProps === null) {
                return [astProp]
            }
            flagProps.push(astProp)
            return flagProps
        }

        /*
         * Whether the plugin sets the child flags itself because it sees the shape of the children, as it does for
         * static JSX children and for the children props that createVNode compiles without normalization.
         * childrenResults is empty for a self-closing element, propChildren is the value of the children attribute.
         */
        function isChildShapeKnown(childrenResults, propChildren, isFragment: boolean) {
            if (childrenResults.requiresNormalization) {
                return false
            }
            const children = childrenResults.children

            // JSX children replace a children prop
            if (!propChildren || (children && (children.kind !== SyntaxKind.ArrayLiteralExpression || children.elements.length > 0))) {
                return true
            }
            if (propChildren.kind === SyntaxKind.StringLiteral) {
                return true
            }
            if (propChildren.kind !== SyntaxKind.JsxExpression) {
                // children=<a /> without braces; a Fragment normalizes a JSX children prop at runtime
                return !isFragment
            }
            const expression = propChildren.expression

            if (!expression || expression.kind === SyntaxKind.NullKeyword) {
                return true
            }
            return !isFragment && isJsx(expression)
        }

        // Warnings go to the console with the location and the code of the flag, as TypeScript has no API for them
        function reportUselessFlag(astProp: JsxAttribute, message: string) {
            if (uselessFlags === 'error') {
                throw new Error(withCodeFrame(astProp, message))
            }
            console.warn('ts-plugin-inferno: ' + withCodeFrame(astProp, message))
        }

        // Reports the flags that cannot change the compiled vNode; each flag is reported once, for its first reason
        function checkFlags(flagProps: JsxAttribute[], vNodeType: number, childrenResults, propChildren) {
            let hasFlagsOverride = false
            let winner: string | null = null

            for (let i = 0; i < flagProps.length; i++) {
                const flagName = getPropertyName(flagProps[i])

                if (flagName === PROP_Flags) {
                    hasFlagsOverride = true
                } else if (flagName !== PROP_ReCreate) {
                    // The child flag that the compiled vNode uses when the children are dynamic
                    if (winner === null || CHILD_FLAG_PROPS.indexOf(flagName) < CHILD_FLAG_PROPS.indexOf(winner)) {
                        winner = flagName
                    }
                }
            }
            const shapeKnown = winner !== null && vNodeType !== TYPE_COMPONENT && isChildShapeKnown(childrenResults, propChildren, vNodeType === TYPE_FRAGMENT)

            for (let i = 0; i < flagProps.length; i++) {
                const astProp = flagProps[i]
                const name = getPropertyName(astProp)
                let message: string | null = null

                if (name === PROP_Flags || name === PROP_ReCreate) {
                    if (vNodeType === TYPE_FRAGMENT) {
                        message = name + ' has no effect on Fragments.'
                    } else if (name === PROP_ReCreate && hasFlagsOverride) {
                        message = PROP_ReCreate + ' is ignored because ' + PROP_Flags + ' replaces the vNode flags. Include ReCreate (' + VNodeFlags.ReCreate + ') in ' + PROP_Flags + ' instead.'
                    }
                } else if (vNodeType === TYPE_COMPONENT) {
                    message = name + ' has no effect on components. Their children are passed in props.children.'
                } else if (shapeKnown) {
                    message = name + ' is not needed: the children are known at compile time, so the plugin sets their child flags. ' +
                        'Child flags only help with dynamic children such as {expression}.'
                } else if (name !== winner) {
                    message = name + ' is ignored because ' + winner + ' takes precedence. Remove one of them.'
                }

                if (message !== null) {
                    reportUselessFlag(astProp, message)
                }
            }
        }

        function getVNodeChildren(astChildren) {
            let children = []
            let parentCanBeKeyed = false
            let requiresNormalization = false
            let foundText = false
            // Whether a child is JSX, only read when there is a single child
            let foundVNode = false
            let hasSpreadChild = false

            for (let i = 0; i < astChildren.length; i++) {
                let child = astChildren[i]
                let vNode = visitor(child)

                if (child.kind === SyntaxKind.JsxExpression) {
                    requiresNormalization = true
                    hasSpreadChild = hasSpreadChild || child.dotDotDotToken !== undefined
                    foundVNode = foundVNode || (child.expression !== undefined && child.dotDotDotToken === undefined && isJsx(child.expression))
                } else if (child.kind === SyntaxKind.JsxText) {
                    // The visitor drops text that collapses to nothing, whitespace that is kept is text as well
                    foundText = foundText || vNode != null
                } else {
                    foundVNode = true
                }

                if (vNode != null) {
                    children.push(vNode)

                    /*
                     * Loop direct children to check if they have key property set
                     * If they do, flag parent as hasKeyedChildren to increase runtime performance of Inferno
                     * When key already found within one of its children, they must all be keyed
                     */
                    const attributes = child.kind === SyntaxKind.JsxElement
                        ? child.openingElement.attributes
                        : child.kind === SyntaxKind.JsxSelfClosingElement ? child.attributes : null

                    if (parentCanBeKeyed === false && attributes) {
                        let astProps = attributes.properties
                        let len = astProps.length

                        while (parentCanBeKeyed === false && len-- > 0) {
                            let prop = astProps[len]

                            if (prop.name && prop.name.text === 'key') {
                                parentCanBeKeyed = true
                            }
                        }
                    }
                }
            }

            // Fix: When there is single child parent cant be keyed either, its faster to use patch than patchKeyed routine in that case
            // A spread child is only valid inside the children array
            let hasSingleChild = children.length === 1 && !hasSpreadChild

            return {
                parentCanBeKeyed: hasSingleChild === false && parentCanBeKeyed,
                children: hasSingleChild
                    ? children[0]
                    : factory.createArrayLiteralExpression(children),
                foundText: foundText,
                foundVNode: foundVNode,
                parentCanBeNonKeyed:
                    !hasSingleChild &&
                    !parentCanBeKeyed &&
                    !requiresNormalization &&
                    astChildren.length > 1,
                requiresNormalization: requiresNormalization,
                hasSingleChild: hasSingleChild,
            }
        }

        function createComponentVNodeArgs(flags: number | Expression, type: any, props: Expression[], key: any, ref: any) {
            let args = []
            let hasProps = props.length > 0
            let hasKey = !isNodeNull(key)
            let hasRef = !isNodeNull(ref)
            args.push(typeof flags === 'number' ? factory.createNumericLiteral(flags + '') : flags)
            args.push(type)

            if (hasProps) {
                props.length === 1
                    ? args.push(props[0])
                    : args.push(createAssignHelper(context, props))
            } else if (hasKey || hasRef) {
                args.push(factory.createNull())
            }

            if (hasKey) {
                args.push(key)
            } else if (hasRef) {
                args.push(factory.createNull())
            }

            if (hasRef) {
                args.push(ref)
            }

            return args
        }

        function createVNodeArgs(
            flags,
            type,
            className,
            children,
            childFlags,
            props,
            key,
            ref,
            context
        ) {
            let args = []
            let hasClassName = !isNodeNull(className)
            let hasChildren = !isNodeNull(children)
            let hasChildFlags = childFlags !== ChildFlags.HasInvalidChildren
            let hasProps = props.length > 0
            let hasKey = !isNodeNull(key)
            let hasRef = !isNodeNull(ref)
            args.push(typeof flags === 'number' ? factory.createNumericLiteral(flags + '') : flags)
            args.push(type)

            if (hasClassName) {
                args.push(className)
            } else if (hasChildren || hasChildFlags || hasProps || hasKey || hasRef) {
                args.push(factory.createNull())
            }

            if (hasChildren) {
                args.push(children)
            } else if (hasChildFlags || hasProps || hasKey || hasRef) {
                args.push(factory.createNull())
            }

            if (hasChildFlags) {
                args.push(
                    typeof childFlags === 'number'
                        ? factory.createNumericLiteral(childFlags + '')
                        : childFlags
                )
            } else if (hasProps || hasKey || hasRef) {
                args.push(factory.createNumericLiteral(ChildFlags.HasInvalidChildren + ''))
            }

            if (hasProps) {
                props.length === 1
                    ? args.push(props[0])
                    : args.push(createAssignHelper(context, props))
            } else if (hasKey || hasRef) {
                args.push(factory.createNull())
            }

            if (hasKey) {
                args.push(key)
            } else if (hasRef) {
                args.push(factory.createNull())
            }

            if (hasRef) {
                args.push(ref)
            }

            return args
        }
    }
}
