import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

describe('Expression children', () => {
    describe('empty expressions', () => {
        it('Should create no children for a component with only a comment', () => {
            assert.equal(transform('<Foo>{/* c */}</Foo>'), 'createComponentVNode(2, Foo);')
        })

        it('Should create an empty fragment for a fragment with only a comment', () => {
            assert.equal(transform('<>{/* c */}</>'), 'createFragment();')
        })

        it('Should ignore a comment next to a dynamic child', () => {
            assert.equal(transform('<div>{/* c */}{a}</div>'), 'createVNode(1, "div", null, a, 0);')
        })

        it('Should ignore a comment between dynamic children', () => {
            assert.equal(transform('<div>{a}{/* x */}{b}</div>'), 'createVNode(1, "div", null, [a, b], 0);')
        })

        it('Should ignore a comment next to component text', () => {
            assert.equal(transform('<Foo>{/* c */}text</Foo>'), 'createComponentVNode(2, Foo, { "children": "text" });')
        })
    })

    describe('literal expressions', () => {
        it('Should pass a string literal child as is', () => {
            assert.equal(transform('<div>{"literal"}</div>'), 'createVNode(1, "div", null, "literal", 0);')
        })

        it('Should pass several string literal children as is', () => {
            assert.equal(transform('<div>{"a"}{"b"}</div>'), 'createVNode(1, "div", null, ["a", "b"], 0);')
        })

        it('Should pass a number child', () => {
            assert.equal(transform('<div>{1}</div>'), 'createVNode(1, "div", null, 1, 0);')
        })

        it('Should pass a null child', () => {
            assert.equal(transform('<div>{null}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should pass an undefined child', () => {
            assert.equal(transform('<div>{undefined}</div>'), 'createVNode(1, "div", null, undefined, 0);')
        })

        it('Should pass a boolean child', () => {
            assert.equal(transform('<div>{true}</div>'), 'createVNode(1, "div", null, true, 0);')
        })

        it('Should pass a template literal child', () => {
            assert.equal(transform('<div>{`tpl ${x}`}</div>'), 'createVNode(1, "div", null, `tpl ${x}`, 0);')
        })

        it('Should pass string literals containing JSX text special characters', () => {
            assert.equal(transform('<div>{">"}{"}"}</div>'), 'createVNode(1, "div", null, [">", "}"], 0);')
        })
    })

    describe('dynamic expressions', () => {
        it('Should compile JSX inside a logical expression', () => {
            assert.equal(transform('<div>{cond && <span/>}</div>'), 'createVNode(1, "div", null, cond && createVNode(1, "span"), 0);')
        })

        it('Should compile JSX inside a ternary', () => {
            assert.equal(transform('<div>{cond ? <a/> : <b/>}</div>'), 'createVNode(1, "div", null, cond ? createVNode(1, "a") : createVNode(1, "b"), 0);')
        })

        it('Should compile keyed JSX returned from map', () => {
            assert.equal(transform('<div>{list.map(i => <li key={i}>{i}</li>)}</div>'), 'createVNode(1, "div", null, list.map(i => createVNode(1, "li", null, i, 0, null, i)), 0);')
        })

        it('Should compile keyed JSX returned from map with a typed parameter', () => {
            assert.equal(transform('<div>{list.map((i: number) => <li key={i}>{i}</li>)}</div>'), 'createVNode(1, "div", null, list.map((i) => createVNode(1, "li", null, i, 0, null, i)), 0);')
        })

        it('Should compile an array literal of keyed JSX', () => {
            assert.equal(transform('<div>{[<a key="1"/>, <b key="2"/>]}</div>'), 'createVNode(1, "div", null, [createVNode(1, "a", null, null, 1, null, "1"), createVNode(1, "b", null, null, 1, null, "2")], 0);')
        })

        it('Should compile an array literal of unkeyed components', () => {
            assert.equal(transform('<div>{[<C/>, <C/>]}</div>'), 'createVNode(1, "div", null, [createComponentVNode(2, C), createComponentVNode(2, C)], 0);')
        })

        it('Should pass a function as component children', () => {
            assert.equal(transform('<Foo>{(v) => <div>{v}</div>}</Foo>'), 'createComponentVNode(2, Foo, { "children": (v) => createVNode(1, "div", null, v, 0) });')
        })

        it('Should pass a typed function as children of a component with type arguments', () => {
            assert.equal(transform('<Foo<string>>{(v: string) => <div>{v}</div>}</Foo>'), 'createComponentVNode(2, Foo, { "children": (v) => createVNode(1, "div", null, v, 0) });')
        })

        it('Should pass an object child as is', () => {
            assert.equal(transform('<div>{ {a} }</div>'), 'createVNode(1, "div", null, { a }, 0);')
        })

        // babel keeps the object spread, TypeScript output uses Object.assign, both copy the props of test
        it('Should compile an expression container holding a spread element', () => {
            assert.equal(transform('<div>{<div {...test} />}</div>'), 'createVNode(1, "div", null, normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, test))), 0);')
        })

        it('Should keep a parenthesized sequence expression', () => {
            assert.equal(transform('<div>{(console.log("foo"), JSON.stringify(props))}</div>'), 'createVNode(1, "div", null, (console.log("foo"), JSON.stringify(props)), 0);')
        })

        it('Should keep optional chaining in a sequence expression', () => {
            assert.equal(transform('<div>{(this?.class, this.class)}</div>'), 'createVNode(1, "div", null, (this?.class, this.class), 0);')
        })
    })

    // Type-only syntax is erased before the plugin runs, the child stays dynamic
    describe('type assertions', () => {
        it('Should compile an as expression child', () => {
            assert.equal(transform('<div>{value as string}</div>'), 'createVNode(1, "div", null, value, 0);')
        })

        it('Should compile a non-null assertion child', () => {
            assert.equal(transform('<div>{maybe!}</div>'), 'createVNode(1, "div", null, maybe, 0);')
        })

        it('Should compile a satisfies expression child', () => {
            assert.equal(transform('<div>{(x satisfies Item)}</div>'), 'createVNode(1, "div", null, x, 0);')
        })
    })

    describe('children prop', () => {
        it('Should use a JSX element children prop given in braces', () => {
            assert.equal(transform('<div children={<span/>} />'), 'createVNode(1, "div", null, createVNode(1, "span"), 2);')
        })

        it('Should create no children for a null children prop', () => {
            assert.equal(transform('<div children={null} />'), 'createVNode(1, "div");')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should mark an element with only a comment child as UnknownChildren', () => {
            assert.equal(transform('<div>{/* comment */}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should mark an element with an empty expression as UnknownChildren', () => {
            assert.equal(transform('<div>{}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should wrap text next to a comment in createTextVNode with UnknownChildren', () => {
            assert.equal(transform('<div>{/* c */}text</div>'), 'createVNode(1, "div", null, createTextVNode("text"), 0);')
        })

        it('Should mark static siblings around a comment as UnknownChildren', () => {
            assert.equal(transform('<div><span/>{/* c */}<span/></div>'), 'createVNode(1, "div", null, [createVNode(1, "span"), createVNode(1, "span")], 0);')
        })
    })
})
