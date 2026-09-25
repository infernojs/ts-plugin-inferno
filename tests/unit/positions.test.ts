import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

describe('JSX positions', function () {
    describe('expression positions', function () {
        it('Should compile JSX in default parameters', function () {
            assert.equal(transform('function F({x = <b/>}) { return <div>{x}</div>; }'), 'function F({ x = createVNode(1, "b") }) { return createVNode(1, "div", null, x, 0); }')
        })

        it('Should compile JSX in static class fields', function () {
            assert.equal(transform('class C { static el = <i/>; }'), 'class C {\n    static el = createVNode(1, "i");\n}')
        })

        // The babel test uses <this.subComponent />, see tests/known-bugs/positions.test.ts
        it('Should compile JSX in a class field arrow function', function () {
            assert.equal(transform('class A { render = () => <this.SubComponent />; }'), 'class A {\n    render = () => createComponentVNode(2, this.SubComponent);\n}')
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
})
