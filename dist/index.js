"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSSIBLE_IMPORTS_TO_ADD = void 0;
var ts = require("typescript");
var flags_1 = require("./utils/flags");
var isComponent_1 = require("./utils/isComponent");
var isFragment_1 = require("./utils/isFragment");
var createAssignHelper_1 = require("./utils/createAssignHelper");
var isNullOrUndefined_1 = require("./utils/isNullOrUndefined");
var getName_1 = require("./utils/getName");
var getValue_1 = require("./utils/getValue");
var svgAttributes_1 = require("./utils/svgAttributes");
var isNodeNull_1 = require("./utils/isNodeNull");
var handleWhiteSpace_1 = require("./utils/handleWhiteSpace");
var vNodeTypes_1 = require("./utils/vNodeTypes");
var updateSourceFile_1 = require("./updateSourceFile");
var NULL;
// All special attributes
var PROP_HasKeyedChildren = '$HasKeyedChildren';
var PROP_HasNonKeyedChildren = '$HasNonKeyedChildren';
var PROP_VNODE_CHILDREN = '$HasVNodeChildren';
var PROP_TEXT_CHILDREN = '$HasTextChildren';
var PROP_ReCreate = '$ReCreate';
var PROP_ChildFlag = '$ChildFlag';
var TYPE_ELEMENT = 0;
var TYPE_COMPONENT = 1;
var TYPE_FRAGMENT = 2;
exports.POSSIBLE_IMPORTS_TO_ADD = ['createFragment', 'createVNode', 'createComponentVNode', 'createTextVNode', 'normalizeProps'];
exports.default = (function () {
    return function (context) {
        var factory = context.factory;
        return function (sourceFile) {
            if (sourceFile.isDeclarationFile) {
                return sourceFile;
            }
            var importSpecifiers = new Map();
            for (var _i = 0, POSSIBLE_IMPORTS_TO_ADD_1 = exports.POSSIBLE_IMPORTS_TO_ADD; _i < POSSIBLE_IMPORTS_TO_ADD_1.length; _i++) {
                var name_1 = POSSIBLE_IMPORTS_TO_ADD_1[_i];
                importSpecifiers.set(name_1, factory.createImportSpecifier(undefined, factory.createIdentifier(name_1)));
            }
            context['infernoImportSpecifiers'] = importSpecifiers;
            context['createFragment'] = false;
            context['createVNode'] = false;
            context['createComponentVNode'] = false;
            context['createTextVNode'] = false;
            context['normalizeProps'] = false;
            var newSourceFile = ts.visitEachChild(sourceFile, visitor, context);
            return (0, updateSourceFile_1.default)(newSourceFile, context);
        };
        function getImportSpecifier(name) {
            return context['infernoImportSpecifiers'].get(name).name;
        }
        function visitor(node) {
            switch (node.kind) {
                case ts.SyntaxKind.JsxFragment:
                    return createFragment(node.children);
                case ts.SyntaxKind.JsxElement:
                    return createVNode(node, node.children);
                case ts.SyntaxKind.JsxSelfClosingElement:
                    return createVNode(node);
                case ts.SyntaxKind.JsxText:
                    var text = (0, handleWhiteSpace_1.default)(node.getFullText());
                    if (text !== '') {
                        /**
                         * TypeScript internal module, src/compiler/transformers/jsx.ts,
                         * unescapes HTML entities such as &nbsp; in JSX text that is
                         * directly inside an element or a fragment.
                         */
                        return factory.createStringLiteral(JSON.parse(ts
                            .transpile("<>" + text + "</>", { jsx: ts.JsxEmit.React })
                            .replace(/^[\s\S]*?("[\s\S]*")[\s\S]*?$/, '$1')));
                    }
                    break;
                case ts.SyntaxKind.JsxExpression:
                    if (node.expression) {
                        return ts.visitNode(node.expression, visitor);
                    }
                    break;
                default:
                    return ts.visitEachChild(node, visitor, context);
            }
        }
        function addCreateTextVNodeCalls(vChildren) {
            // When normalization is not needed we need to manually compile text into vNodes
            for (var j = 0; j < vChildren.elements.length; j++) {
                var aChild = vChildren.elements[j];
                if (aChild.kind === ts.SyntaxKind.StringLiteral) {
                    vChildren.elements[j] = factory.createCallExpression(getImportSpecifier('createTextVNode'), [], [aChild]);
                }
            }
            return vChildren;
        }
        function transformTextNodes(vChildren) {
            context['createTextVNode'] = true;
            if (vChildren.elements) {
                return addCreateTextVNodeCalls(vChildren);
            }
            if (vChildren.kind === ts.SyntaxKind.StringLiteral) {
                return factory.createCallExpression(getImportSpecifier('createTextVNode'), [], [vChildren]);
            }
        }
        function createFragmentVNodeArgs(children, childFlags, key) {
            var args = [];
            var hasChildren = !(0, isNodeNull_1.default)(children);
            var hasChildFlags = hasChildren && childFlags !== flags_1.ChildFlags.HasInvalidChildren;
            var hasKey = !(0, isNodeNull_1.default)(key);
            if (hasChildren) {
                if (childFlags === flags_1.ChildFlags.HasNonKeyedChildren ||
                    childFlags === flags_1.ChildFlags.HasKeyedChildren ||
                    childFlags === flags_1.ChildFlags.UnknownChildren ||
                    children.kind === ts.SyntaxKind.ArrayLiteralExpression) {
                    args.push(children);
                }
                else {
                    args.push(factory.createArrayLiteralExpression([children]));
                }
            }
            else if (hasChildFlags || hasKey) {
                args.push(NULL);
            }
            if (hasChildFlags) {
                args.push(typeof childFlags === 'number'
                    ? factory.createNumericLiteral(childFlags + '')
                    : childFlags);
            }
            else if (hasKey) {
                args.push(factory.createNumericLiteral(flags_1.ChildFlags.HasInvalidChildren + ''));
            }
            if (hasKey) {
                args.push(key);
            }
            return args;
        }
        function createFragment(children) {
            var childrenResults = getVNodeChildren(children);
            var vChildren = childrenResults.children;
            var childFlags;
            if (!childrenResults.requiresNormalization) {
                if (childrenResults.parentCanBeKeyed) {
                    childFlags = flags_1.ChildFlags.HasKeyedChildren;
                }
                else {
                    childFlags = flags_1.ChildFlags.HasNonKeyedChildren;
                }
                if (childrenResults.hasSingleChild) {
                    vChildren = factory.createArrayLiteralExpression([vChildren]);
                }
            }
            else {
                childFlags = flags_1.ChildFlags.UnknownChildren;
            }
            if (vChildren && vChildren !== NULL && childrenResults.foundText) {
                vChildren = transformTextNodes(vChildren);
            }
            context['createFragment'] = true;
            return factory.createCallExpression(getImportSpecifier('createFragment'), [], createFragmentVNodeArgs(vChildren, childFlags));
        }
        function createVNode(node, children) {
            var vType;
            var vProps;
            var vChildren;
            var childrenResults = {};
            var text;
            if (children) {
                var openingElement = node.openingElement;
                vType = getVNodeType(openingElement.tagName);
                vProps = getVNodeProps(openingElement.attributes.properties, vType.vNodeType === TYPE_COMPONENT);
                childrenResults = getVNodeChildren(children);
                vChildren = childrenResults.children;
            }
            else {
                vType = getVNodeType(node.tagName);
                vProps = getVNodeProps(node.attributes.properties, vType.vNodeType === TYPE_COMPONENT);
            }
            var childFlags = flags_1.ChildFlags.HasInvalidChildren;
            var flags = vType.flags;
            var props = vProps.props[0] || factory.createObjectLiteralExpression();
            var childIndex = -1;
            var i = 0;
            if (vProps.hasReCreateFlag) {
                flags = flags | flags_1.VNodeFlags.ReCreate;
            }
            if (vProps.contentEditable) {
                flags = flags | flags_1.VNodeFlags.ContentEditable;
            }
            if (vType.vNodeType === TYPE_COMPONENT) {
                if (vChildren) {
                    if (!(vChildren.kind === ts.SyntaxKind.ArrayLiteralExpression &&
                        vChildren.elements.length === 0)) {
                        // Remove children from props, if it exists
                        for (i = 0; i < props.properties.length; i++) {
                            if (props.properties[i] &&
                                props.properties[i].name.text === 'children') {
                                childIndex = i;
                                break;
                            }
                        }
                        if (childIndex !== -1) {
                            props.properties.splice(childIndex, 1); // Remove prop children
                        }
                        props.properties.push(factory.createPropertyAssignment((0, getName_1.default)('children'), vChildren));
                        vProps.props[0] = props;
                    }
                    vChildren = NULL;
                }
            }
            else {
                if (((vChildren &&
                    vChildren.kind === ts.SyntaxKind.ArrayLiteralExpression) ||
                    !vChildren) &&
                    vProps.propChildren) {
                    if (vProps.propChildren.kind === ts.SyntaxKind.StringLiteral) {
                        text = (0, handleWhiteSpace_1.default)(vProps.propChildren.text);
                        if (text !== '') {
                            if (vType.vNodeType !== TYPE_FRAGMENT) {
                                childrenResults.foundText = true;
                                childrenResults.hasSingleChild = true;
                            }
                            vChildren = factory.createStringLiteral(text);
                        }
                    }
                    else if (vProps.propChildren.kind === ts.SyntaxKind.JsxExpression) {
                        if (vProps.propChildren.expression.kind === ts.SyntaxKind.NullKeyword) {
                            vChildren = NULL;
                            childFlags = flags_1.ChildFlags.HasInvalidChildren;
                        }
                        else {
                            vChildren = createVNode(vProps.propChildren.expression, vProps.propChildren.expression.children);
                            childFlags = flags_1.ChildFlags.HasVNodeChildren;
                        }
                    }
                    else {
                        vChildren = NULL;
                        childFlags = flags_1.ChildFlags.HasInvalidChildren;
                    }
                }
                if ((childrenResults && !childrenResults.requiresNormalization) ||
                    vProps.childrenKnown) {
                    if (vProps.hasKeyedChildren || childrenResults.parentCanBeKeyed) {
                        childFlags = flags_1.ChildFlags.HasKeyedChildren;
                    }
                    else if (vProps.hasNonKeyedChildren ||
                        childrenResults.parentCanBeNonKeyed) {
                        childFlags = flags_1.ChildFlags.HasNonKeyedChildren;
                    }
                    else if (vProps.hasTextChildren ||
                        (childrenResults.foundText && childrenResults.hasSingleChild)) {
                        childrenResults.foundText = vType.vNodeType === TYPE_FRAGMENT;
                        childFlags =
                            vType.vNodeType === TYPE_FRAGMENT
                                ? flags_1.ChildFlags.HasNonKeyedChildren
                                : flags_1.ChildFlags.HasTextChildren;
                    }
                    else if (childrenResults.hasSingleChild) {
                        childFlags =
                            vType.vNodeType === TYPE_FRAGMENT
                                ? flags_1.ChildFlags.HasNonKeyedChildren
                                : flags_1.ChildFlags.HasVNodeChildren;
                    }
                }
                else {
                    if (vProps.hasKeyedChildren) {
                        childFlags = flags_1.ChildFlags.HasKeyedChildren;
                    }
                    else if (vProps.hasNonKeyedChildren) {
                        childFlags = flags_1.ChildFlags.HasNonKeyedChildren;
                    }
                }
                // Remove children from props, if it exists
                childIndex = -1;
                for (i = 0; i < props.properties.length; i++) {
                    if (props.properties[i].name &&
                        props.properties[i].name.text === 'children') {
                        childIndex = i;
                        break;
                    }
                }
                if (childIndex !== -1) {
                    props.properties.splice(childIndex, 1); // Remove prop children
                }
            }
            if (vChildren && vChildren !== NULL && childrenResults.foundText) {
                vChildren = transformTextNodes(vChildren);
            }
            var willNormalizeChildren = !(vType.vNodeType === TYPE_COMPONENT) &&
                childrenResults &&
                childrenResults.requiresNormalization &&
                !vProps.childrenKnown;
            if (vProps.childFlags) {
                // If $ChildFlag is provided it is runtime dependant
                childFlags = vProps.childFlags;
            }
            else {
                childFlags = willNormalizeChildren
                    ? flags_1.ChildFlags.UnknownChildren
                    : childFlags;
            }
            // Delete empty objects
            if (vProps.props.length === 1 &&
                vProps.props[0] &&
                !vProps.props[0].properties.length) {
                vProps.props.splice(0, 1);
            }
            var createVNodeCall;
            if (vType.vNodeType === TYPE_COMPONENT) {
                createVNodeCall = factory.createCallExpression(getImportSpecifier('createComponentVNode'), [], createComponentVNodeArgs(flags, vType.type, vProps.props, vProps.key, vProps.ref));
                context['createComponentVNode'] = true;
            }
            else if (vType.vNodeType === TYPE_ELEMENT) {
                createVNodeCall = factory.createCallExpression(getImportSpecifier('createVNode'), [], createVNodeArgs(flags, vType.type, vProps.className, vChildren, childFlags, vProps.props, vProps.key, vProps.ref, context));
                context['createVNode'] = true;
            }
            else if (vType.vNodeType === TYPE_FRAGMENT) {
                if (!childrenResults.requiresNormalization &&
                    childrenResults.hasSingleChild) {
                    vChildren = factory.createArrayLiteralExpression([vChildren]);
                }
                createVNodeCall = factory.createCallExpression(getImportSpecifier('createFragment'), [], createFragmentVNodeArgs(vChildren, childFlags, vProps.key));
                context['createFragment'] = true;
            }
            // NormalizeProps will normalizeChildren too
            if (vProps.needsNormalization) {
                context['normalizeProps'] = true;
                createVNodeCall = factory.createCallExpression(getImportSpecifier('normalizeProps'), [], [createVNodeCall]);
            }
            return createVNodeCall;
        }
        function getVNodeType(type) {
            var vNodeType;
            var flags;
            var text = type.getText();
            var textSplitted = text.split('.');
            var length = textSplitted.length;
            var finalText = textSplitted[length - 1];
            if ((0, isFragment_1.default)(finalText)) {
                vNodeType = TYPE_FRAGMENT;
            }
            else if ((0, isComponent_1.default)(finalText)) {
                vNodeType = TYPE_COMPONENT;
                flags = flags_1.VNodeFlags.ComponentUnknown;
            }
            else {
                vNodeType = TYPE_ELEMENT;
                type = factory.createStringLiteral(text);
                flags = vNodeTypes_1.default[text] || flags_1.VNodeFlags.HtmlElement;
            }
            return {
                type: type,
                vNodeType: vNodeType,
                flags: flags,
            };
        }
        function getVNodeProps(astProps, isComponent) {
            var props = [];
            var key = null;
            var ref = null;
            var className = null;
            var hasTextChildren = false;
            var hasKeyedChildren = false;
            var hasNonKeyedChildren = false;
            var childrenKnown = false;
            var needsNormalization = false;
            var hasReCreateFlag = false;
            var propChildren = null;
            var childFlags = null;
            var contentEditable = false;
            var assignArgs = [];
            for (var i = 0; i < astProps.length; i++) {
                var astProp = astProps[i];
                var initializer = astProp.initializer;
                if (astProp.kind === ts.SyntaxKind.JsxSpreadAttribute) {
                    needsNormalization = true;
                    assignArgs = [factory.createObjectLiteralExpression(), astProp.expression];
                }
                else {
                    var propName = astProp.name.text;
                    if (!isComponent &&
                        (propName === 'className' || propName === 'class')) {
                        className = (0, getValue_1.default)(initializer, visitor);
                    }
                    else if (!isComponent && propName === 'htmlFor') {
                        props.push(factory.createPropertyAssignment((0, getName_1.default)('for'), (0, getValue_1.default)(initializer, visitor)));
                    }
                    else if (!isComponent && propName === 'onDoubleClick') {
                        props.push(factory.createPropertyAssignment((0, getName_1.default)('onDblClick'), (0, getValue_1.default)(initializer, visitor)));
                    }
                    else if (propName.substr(0, 11) === 'onComponent' && isComponent) {
                        if (!ref) {
                            ref = factory.createObjectLiteralExpression([]);
                        }
                        ref.properties.push(factory.createPropertyAssignment((0, getName_1.default)(propName), (0, getValue_1.default)(initializer, visitor)));
                    }
                    else if (!isComponent && propName in svgAttributes_1.default) {
                        // React compatibility for SVG Attributes
                        props.push(factory.createPropertyAssignment((0, getName_1.default)(svgAttributes_1.default[propName]), (0, getValue_1.default)(initializer, visitor)));
                    }
                    else {
                        switch (propName) {
                            case 'noNormalize':
                            case '$NoNormalize':
                                throw 'Inferno JSX plugin:\n' +
                                    propName +
                                    ' is deprecated use: $HasVNodeChildren, or if children shape is dynamic you can use: $ChildFlag={expression} see inferno package:inferno-vnode-flags (ChildFlags) for possible values';
                            case 'hasKeyedChildren':
                            case 'hasNonKeyedChildren':
                                throw 'Inferno JSX plugin:\n' +
                                    propName +
                                    ' is deprecated use: ' +
                                    '$' +
                                    propName.charAt(0).toUpperCase() +
                                    propName.slice(1);
                            case PROP_ChildFlag:
                                childrenKnown = true;
                                childFlags = (0, getValue_1.default)(initializer, visitor);
                                break;
                            case PROP_VNODE_CHILDREN:
                                childrenKnown = true;
                                break;
                            case PROP_TEXT_CHILDREN:
                                childrenKnown = true;
                                hasTextChildren = true;
                                break;
                            case PROP_HasNonKeyedChildren:
                                hasNonKeyedChildren = true;
                                childrenKnown = true;
                                break;
                            case PROP_HasKeyedChildren:
                                hasKeyedChildren = true;
                                childrenKnown = true;
                                break;
                            case 'ref':
                                ref = (0, getValue_1.default)(initializer, visitor);
                                break;
                            case 'key':
                                key = (0, getValue_1.default)(initializer, visitor);
                                break;
                            case PROP_ReCreate:
                                hasReCreateFlag = true;
                                break;
                            default:
                                if (propName === 'children') {
                                    propChildren = astProp.initializer;
                                }
                                if (propName.toLowerCase() === 'contenteditable') {
                                    contentEditable = true;
                                }
                                props.push(factory.createPropertyAssignment((0, getName_1.default)(propName), initializer
                                    ? (0, getValue_1.default)(initializer, visitor)
                                    : factory.createTrue()));
                        }
                    }
                }
            }
            if (props.length)
                assignArgs.push(factory.createObjectLiteralExpression(props));
            return {
                props: assignArgs,
                key: (0, isNullOrUndefined_1.default)(key) ? NULL : key,
                ref: (0, isNullOrUndefined_1.default)(ref) ? NULL : ref,
                hasKeyedChildren: hasKeyedChildren,
                hasNonKeyedChildren: hasNonKeyedChildren,
                propChildren: propChildren,
                childrenKnown: childrenKnown,
                className: (0, isNullOrUndefined_1.default)(className) ? NULL : className,
                childFlags: childFlags,
                hasReCreateFlag: hasReCreateFlag,
                needsNormalization: needsNormalization,
                contentEditable: contentEditable,
                hasTextChildren: hasTextChildren,
            };
        }
        function getVNodeChildren(astChildren) {
            var children = [];
            var parentCanBeKeyed = false;
            var requiresNormalization = false;
            var foundText = false;
            for (var i = 0; i < astChildren.length; i++) {
                var child = astChildren[i];
                var vNode = visitor(child);
                if (child.kind === ts.SyntaxKind.JsxExpression) {
                    requiresNormalization = true;
                }
                else if (child.kind === ts.SyntaxKind.JsxText &&
                    (0, handleWhiteSpace_1.default)(child.getText()) !== '') {
                    foundText = true;
                }
                if (!(0, isNullOrUndefined_1.default)(vNode)) {
                    children.push(vNode);
                    /*
                     * Loop direct children to check if they have key property set
                     * If they do, flag parent as hasKeyedChildren to increase runtime performance of Inferno
                     * When key already found within one of its children, they must all be keyed
                     */
                    if (parentCanBeKeyed === false && child.openingElement) {
                        var astProps = child.openingElement.attributes.properties;
                        var len = astProps.length;
                        while (parentCanBeKeyed === false && len-- > 0) {
                            var prop = astProps[len];
                            if (prop.name && prop.name.text === 'key') {
                                parentCanBeKeyed = true;
                            }
                        }
                    }
                }
            }
            // Fix: When there is single child parent cant be keyed either, its faster to use patch than patchKeyed routine in that case
            var hasSingleChild = children.length === 1;
            return {
                parentCanBeKeyed: hasSingleChild === false && parentCanBeKeyed,
                children: hasSingleChild
                    ? children[0]
                    : factory.createArrayLiteralExpression(children),
                foundText: foundText,
                parentCanBeNonKeyed: !hasSingleChild &&
                    !parentCanBeKeyed &&
                    !requiresNormalization &&
                    astChildren.length > 1,
                requiresNormalization: requiresNormalization,
                hasSingleChild: hasSingleChild,
            };
        }
        function createComponentVNodeArgs(flags, type, props, key, ref) {
            var args = [];
            var hasProps = props.length > 0;
            var hasKey = !(0, isNodeNull_1.default)(key);
            var hasRef = !(0, isNodeNull_1.default)(ref);
            args.push(factory.createNumericLiteral(flags + ''));
            args.push(type);
            if (hasProps) {
                props.length === 1
                    ? args.push(props[0])
                    : args.push((0, createAssignHelper_1.default)(context, props));
            }
            else if (hasKey || hasRef) {
                args.push(factory.createNull());
            }
            if (hasKey) {
                args.push(key);
            }
            else if (hasRef) {
                args.push(factory.createNull());
            }
            if (hasRef) {
                args.push(ref);
            }
            return args;
        }
        function createVNodeArgs(flags, type, className, children, childFlags, props, key, ref, context) {
            var args = [];
            var hasClassName = !(0, isNodeNull_1.default)(className);
            var hasChildren = !(0, isNodeNull_1.default)(children);
            var hasChildFlags = childFlags !== flags_1.ChildFlags.HasInvalidChildren;
            var hasProps = props.length > 0;
            var hasKey = !(0, isNodeNull_1.default)(key);
            var hasRef = !(0, isNodeNull_1.default)(ref);
            args.push(factory.createNumericLiteral(flags + ''));
            args.push(type);
            if (hasClassName) {
                args.push(className);
            }
            else if (hasChildren || hasChildFlags || hasProps || hasKey || hasRef) {
                args.push(factory.createNull());
            }
            if (hasChildren) {
                args.push(children);
            }
            else if (hasChildFlags || hasProps || hasKey || hasRef) {
                args.push(factory.createNull());
            }
            if (hasChildFlags) {
                args.push(typeof childFlags === 'number'
                    ? factory.createNumericLiteral(childFlags + '')
                    : childFlags);
            }
            else if (hasProps || hasKey || hasRef) {
                args.push(factory.createNumericLiteral(flags_1.ChildFlags.HasInvalidChildren + ''));
            }
            if (hasProps) {
                props.length === 1
                    ? args.push(props[0])
                    : args.push((0, createAssignHelper_1.default)(context, props));
            }
            else if (hasKey || hasRef) {
                args.push(factory.createNull());
            }
            if (hasKey) {
                args.push(key);
            }
            else if (hasRef) {
                args.push(factory.createNull());
            }
            if (hasRef) {
                args.push(ref);
            }
            return args;
        }
    };
});
