import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {es5, es5CommonJS, run, transform, transformWith} from './helpers'

describe('Spread attributes', () => {
    describe('spread position', () => {
        it('Should keep a spread before other props', () => {
            assert.equal(transform('<Component {...x} y={2} z />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, x, { "y": 2, "z": true })));')
        })

        it('Should keep a spread after other props', () => {
            assert.equal(transform('<Component y={2} z { ... x } />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, { "y": 2, "z": true }, x)));')
        })

        it('Should keep a spread between other props', () => {
            assert.equal(transform('<Component y={2} { ... x } z />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, { "y": 2 }, x, { "z": true })));')
        })

        // Babel's case has JSX children, see tests/known-bugs/spread.test.ts
        it('Should keep the same spread twice', () => {
            assert.equal(transform('<Component x={1} y="2" {...z} {...z} />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, { "x": 1, "y": "2" }, z, z)));')
        })

        // Babel's case has JSX children, see tests/known-bugs/spread.test.ts
        it('Should keep a sequence expression spread', () => {
            assert.equal(transform('<Component x="1" {...(z = { y: 2 }, z)} z={3} />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, { "x": "1" }, (z = { y: 2 }, z), { "z": 3 })));')
        })

        it('Should keep a null spread', () => {
            assert.equal(transform('<div {...null} />'), 'normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, null)));')
        })

        it('Should keep an object literal spread containing __proto__', () => {
            assert.equal(transform('<Foo {...{__proto__: a}} b="1" />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, { __proto__: a }, { "b": "1" })));')
        })

        it('Should keep a comment inside a spread', () => {
            assert.equal(transform('<div {.../*i18n*/{ id: "hello" }} />'), 'normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, /*i18n*/ { id: "hello" })));')
        })

        it('Should strip a type assertion from a spread', () => {
            assert.equal(transform('<Foo {...p as any} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p)));')
        })

        it('Should strip a non-null assertion from a spread', () => {
            assert.equal(transform('<Foo {...p!} a="1" />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p, { "a": "1" })));')
        })

        it('Should strip satisfies from a spread', () => {
            assert.equal(transform('<Foo {...(p satisfies object)} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p)));')
        })

        it('Should keep a spread on a generic component', () => {
            assert.equal(transform('<Foo<Props> {...p} a={1} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p, { "a": 1 })));')
        })
    })

    describe('spread with special props', () => {
        it('Should keep className, key and ref next to spreads', () => {
            assert.equal(transform('<div {...a} {...b} className="x" key="k" ref={r}>{c}</div>'), 'normalizeProps(createVNode(1, "div", "x", c, 0, Object.assign({}, a, b), "k", r));')
        })

        it('Should keep key next to a spread on a component', () => {
            assert.equal(transform('<Foo {...p} key="k"/>'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p), "k"));')
        })

        it('Should keep ref next to a spread on a component', () => {
            assert.equal(transform('<Foo {...p} ref={r}/>'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p), null, r));')
        })

        it('Should keep a children prop next to a spread on an element', () => {
            assert.equal(transform('<div {...p} children="x"/>'), 'normalizeProps(createVNode(1, "div", null, "x", 16, Object.assign({}, p)));')
        })

        it('Should keep dynamic children next to a spread', () => {
            assert.equal(transform('<div {...p}>{a}{b}</div>'), 'normalizeProps(createVNode(1, "div", null, [a, b], 0, Object.assign({}, p)));')
        })

        it('Should keep a component children prop next to a spread', () => {
            assert.equal(transform('<Foo children={a} {...p} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, { "children": a }, p)));')
        })

        it('Should let a later spread override a component children prop', () => {
            assert.equal(run('<Foo children={a} {...p} />', {Foo: 'Foo', a: 'prop', p: {children: 'spread'}}).props.children, 'spread')
        })

        it('Should prefer JSX children over a children prop next to a spread', () => {
            assert.equal(run('<Foo {...p} children={a}>b</Foo>', {Foo: 'Foo', p: {}, a: 'prop'}).props.children, 'b')
        })

        it('Should keep an attribute after a spread', () => {
            assert.equal(transform('<input {...props} type="radio" />'), 'normalizeProps(createVNode(64, "input", null, null, 1, Object.assign({}, props, { "type": "radio" })));')
        })

        it('Should keep a spread of a conditional object', () => {
            assert.equal(transform('<div {...(c ? {class: "x"} : {})} />'), 'normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, (c ? { class: "x" } : {}))));')
        })
    })

    describe('other compilation targets', () => {
        // Babel compiles the spread with _objectSpread, the TS plugin runs after the ES5 transforms and emits Object.assign
        it('Should compile spreads with Object.assign for ES5', () => {
            assert.equal(transformWith('<div {...p} a="1"/>', es5), 'import { createVNode, normalizeProps } from "inferno";\nnormalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, p, { "a": "1" })));')
        })

        it('Should reference inferno helpers through the required module for CommonJS', () => {
            assert.equal(transformWith('<div {...p}/>', es5CommonJS), 'var $inferno = require("inferno");\nvar normalizeProps = $inferno.normalizeProps;\nvar createVNode = $inferno.createVNode;\nnormalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, p)));')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel and oxc flatten this into plain props
        it('Should not flatten an object literal spread', () => {
            assert.equal(transform('<Foo {...{a: 1}} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, { a: 1 })));')
        })

        // normalizeProps lets a key from the spread win either way; JSX order says the later one should
        it('Should compile a key before a spread like a key after it', () => {
            assert.equal(transform('<Foo key="k" {...p}/>'), transform('<Foo {...p} key="k"/>'))
            assert.equal(transform('<Foo key="k" {...p}/>'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p), "k"));')
        })

        // normalizeProps keeps this className even when the spread contains a later className
        it('Should pass className before a spread as the className argument', () => {
            assert.equal(transform('<div className="x" {...p}/>'), 'normalizeProps(createVNode(1, "div", "x", null, 1, Object.assign({}, p)));')
        })

        it('Should evaluate className before the other props', () => {
            assert.equal(transform('<div onClick={a()} className={b()} key={c()} ref={d()} />'), 'createVNode(1, "div", b(), null, 1, { "onClick": a() }, c(), d());')
        })
    })
})
