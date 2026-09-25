import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import transformer from '../../src'
import {stripInfernoImport, transform} from './helpers'

describe('JSX positions', function () {
    describe('expression positions', function () {
        it('Should compile JSX in default parameters', function () {
            assert.equal(transform('function F({x = <b/>}) { return <div>{x}</div>; }'), 'function F({ x = createVNode(1, "b") }) { return createVNode(1, "div", null, x, 0); }')
        })

        it('Should compile JSX in static class fields', function () {
            assert.equal(transform('class C { static el = <i/>; }'), 'class C {\n    static el = createVNode(1, "i");\n}')
        })

        it('Should compile JSX in a class field arrow function', function () {
            assert.equal(transform('class A { render = () => <this.subComponent />; }'), 'class A {\n    render = () => createComponentVNode(2, this.subComponent);\n}')
        })

        it('Should compile JSX in a default export', function () {
            assert.equal(transform('export default () => <div/>;'), 'export default () => createVNode(1, "div");')
        })

        it('Should compile JSX in a named export', function () {
            assert.equal(transform('export const A = () => <div/>;'), 'export const A = () => createVNode(1, "div");')
        })

        it('Should compile JSX inside higher-order component calls', function () {
            assert.equal(transform('const C = memo(forwardRef((props, ref) => <div ref={ref}/>));'), 'const C = memo(forwardRef((props, ref) => createVNode(1, "div", null, null, 1, null, null, ref)));')
        })

        it('Should compile several top-level JSX expression statements', function () {
            assert.equal(transform('<div>{a}</div>;\n<span>{b}</span>'), 'createVNode(1, "div", null, a, 0);\ncreateVNode(1, "span", null, b, 0);')
        })

        it('Should compile JSX used as a component variable', function () {
            assert.equal(transform('let Foo = <div />;\n<Foo />;'), 'let Foo = createVNode(1, "div");\ncreateComponentVNode(2, Foo);')
        })
    })

    describe('JSX created by other transformers', function () {
        it('Should compile JSX nodes built without source locations', function () {
            const makeJSX: ts.TransformerFactory<ts.SourceFile> = context => {
                const {factory} = context
                const visit = (node: ts.Node): ts.Node => {
                    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'makeJSX') {
                        return factory.createJsxElement(
                            factory.createJsxOpeningElement(factory.createIdentifier('div'), undefined, factory.createJsxAttributes([
                                factory.createJsxAttribute(factory.createIdentifier('title'), factory.createStringLiteral('generated'))
                            ])),
                            [factory.createJsxText('text')],
                            factory.createJsxClosingElement(factory.createIdentifier('div'))
                        )
                    }
                    return ts.visitEachChild(node, visit, context)
                }

                return sourceFile => ts.visitNode(sourceFile, visit) as ts.SourceFile
            }
            const code = ts.transpileModule('export const el = makeJSX();', {
                fileName: 'file.tsx',
                compilerOptions: {jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, ignoreDeprecations: '6.0', alwaysStrict: false},
                transformers: {before: [makeJSX], after: [transformer()]}
            }).outputText

            assert.equal(stripInfernoImport(code), 'export const el = createVNode(1, "div", null, "text", 16, { "title": "generated" });\n')
        })
    })
})
