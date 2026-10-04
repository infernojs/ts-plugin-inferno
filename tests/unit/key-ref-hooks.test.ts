import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows, run, transform} from './helpers'

const VALUELESS_KEY_ERROR = 'Please provide an explicit key value. Using "key" as a shorthand for "key={true}" is not allowed.'
const VALUELESS_REF_ERROR = 'Please provide an explicit ref value. Using "ref" as a shorthand for "ref={true}" is not allowed.'

describe('key, ref and onComponent hooks', () => {
    describe('ref', () => {
        it('Should pass ref to an element', () => {
            assert.equal(transform('<div ref={a} />'), 'newVNode(17, "div", null, null, null, null, a);')
        })

        it('Should pass ref and key to an element', () => {
            assert.equal(transform('<div ref={a} key="k" />'), 'newVNode(17, "div", null, null, null, "k", a);')
        })

        it('Should pass ref to an element with dynamic children', () => {
            assert.equal(transform('<div ref={a}>{b}</div>'), 'newVNode(1, "div", null, b, null, null, a);')
        })

        it('Should pass ref to a component', () => {
            assert.equal(transform('<Foo ref={r} />'), 'newComponentVNode(0, Foo, null, null, r);')
        })

        it('Should pass key and ref to a component', () => {
            assert.equal(transform('<Foo key="k" ref={r} />'), 'newComponentVNode(0, Foo, null, "k", r);')
        })

        it('Should pass a string ref', () => {
            assert.equal(transform('<div ref="stringRef" />'), 'newVNode(17, "div", null, null, null, null, "stringRef");')
        })

        // Babel passes both nulls explicitly; Inferno treats omitted key and ref arguments as null
        it('Should pass null key and ref', () => {
            assert.equal(transform('<div key={null} ref={null} />'), 'newVNode(17, "div");')
        })

        it('Should pass ref and other props to a component', () => {
            assert.equal(transform('<Component ref={ref} foo="56" />'), 'newComponentVNode(0, Component, { "foo": "56" }, null, ref);')
        })

        it('Should pass every argument to a component', () => {
            assert.equal(transform('<Parent a="a" b={{b: "b"}} c={C} key="testKey" ref={testRef} />'), 'newComponentVNode(0, Parent, { "a": "a", "b": { b: "b" }, "c": C }, "testKey", testRef);')
        })

        it('Should pass key and ref to a generic component', () => {
            assert.equal(transform('<Foo<string> key="k" ref={r} />'), 'newComponentVNode(0, Foo, null, "k", r);')
        })
    })

    describe('key values', () => {
        it('Should pass an undefined key', () => {
            assert.equal(transform('<div key={undefined} />'), 'newVNode(17, "div", null, null, null, undefined);')
        })

        it('Should pass numeric and empty string keys', () => {
            assert.equal(transform('<div key={0}><a key=""/><b key="x"/></div>'), 'newVNode(33, "div", null, [newVNode(17, "a", null, null, null, ""), newVNode(17, "b", null, null, null, "x")], null, 0);')
        })

        it('Should pass an object key', () => {
            assert.equal(transform('<div key={obj} />'), 'newVNode(17, "div", null, null, null, obj);')
        })

        it('Should strip type syntax from key and ref', () => {
            assert.equal(transform('<div key={k!} ref={r as any} />'), 'newVNode(17, "div", null, null, null, k, r);')
        })

        it('Should strip satisfies from a key', () => {
            assert.equal(transform('<Foo key={id satisfies string} />'), 'newComponentVNode(0, Foo, null, id);')
        })

        it('Should reject a valueless key on an element', () => {
            expectThrows(() => transform('<div key />'), VALUELESS_KEY_ERROR)
        })

        it('Should reject a valueless key on a component', () => {
            expectThrows(() => transform('<Foo key />'), VALUELESS_KEY_ERROR)
        })

        it('Should reject a valueless key inside an array (babel should-disallow-valueless-key)', () => {
            expectThrows(() => transform('[<div key></div>]'), VALUELESS_KEY_ERROR)
        })

        it('Should reject a valueless key on a generic component', () => {
            expectThrows(() => transform('<Foo<string> key />'), VALUELESS_KEY_ERROR)
        })

        it('Should point the valueless key error at the key', () => {
            expectThrows(() => transform('<ul>\n  <li key>a</li>\n</ul>'), 'file.tsx(2,7): ' + VALUELESS_KEY_ERROR + '\n  1 | <ul>\n> 2 |   <li key>a</li>\n    |       ^^^\n  3 | </ul>')
        })
    })

    describe('keyed children', () => {
        it('Should mark mixed keyed and unkeyed children as keyed', () => {
            assert.equal(transform('<div><span key="k"/><span/></div>'), 'newVNode(33, "div", null, [newVNode(17, "span", null, null, null, "k"), newVNode(17, "span")]);')
        })

        it('Should mark a single keyed child as a vnode child', () => {
            assert.equal(transform('<div><span key="k"/></div>'), 'newVNode(9, "div", null, newVNode(17, "span", null, null, null, "k"));')
        })

        it('Should mark duplicate sibling keys as keyed', () => {
            assert.equal(transform('<><a key="a"/><a key="a"/></>'), 'newFragment(288, [newVNode(17, "a", null, null, null, "a"), newVNode(17, "a", null, null, null, "a")]);')
        })

        it('Should mark self-closing keyed component children as keyed', () => {
            assert.equal(transform('<div><Item<T> key={a} /><Item<T> key={b} /></div>'), 'newVNode(33, "div", null, [newComponentVNode(0, Item, null, a), newComponentVNode(0, Item, null, b)]);')
        })

        it('Should not mark children as keyed when normalization is needed', () => {
            assert.equal(transform('<div>{a}<span key="k"/></div>'), 'newVNode(1, "div", null, [a, newVNode(17, "span", null, null, null, "k")]);')
        })

        it('Should not inspect keys of component children', () => {
            assert.equal(transform('<Foo key="a"><Bar key="b"/><Bar key="c"/></Foo>'), 'newComponentVNode(0, Foo, { "children": [newComponentVNode(0, Bar, null, "b"), newComponentVNode(0, Bar, null, "c")] }, "a");')
        })

        it('Should not detect keys passed through spread', () => {
            assert.equal(transform('<div><Foo {...{key: "k"}}/><Foo {...{key: "j"}}/></div>'), 'newVNode(5, "div", null, [normalizeProps(newComponentVNode(0, Foo, Object.assign({}, { key: "k" }))), normalizeProps(newComponentVNode(0, Foo, Object.assign({}, { key: "j" })))]);')
        })

        it('Should mark keyed children of an element with a spread as keyed', () => {
            assert.equal(transform('<div {...p}><span key="a"></span><span key="b"></span></div>'), 'normalizeProps(newVNode(33, "div", null, [newVNode(17, "span", null, null, null, "a"), newVNode(17, "span", null, null, null, "b")], Object.assign({}, p)));')
        })
    })

    describe('onComponent hooks', () => {
        const r = {onComponentWillMount: 'willMount'}
        const scope = {Foo: 'Foo', r, m: 'didMount', a: 'didAppear', b: 'didMount', i: 1}

        it('Should move every onComponent hook into ref', () => {
            assert.equal(transform('<Foo onComponentWillMount={a} onComponentWillUnmount={b} onComponentShouldUpdate={c} onComponentWillUpdate={d} onComponentDidUpdate={e} />'), 'newComponentVNode(0, Foo, null, null, { "onComponentWillMount": a, "onComponentWillUnmount": b, "onComponentShouldUpdate": c, "onComponentWillUpdate": d, "onComponentDidUpdate": e });')
        })

        it('Should move hooks into ref for member expression components', () => {
            assert.equal(transform('<Foo.Bar onComponentDidMount={a} />'), 'newComponentVNode(0, Foo.Bar, null, null, { "onComponentDidMount": a });')
        })

        it('Should move hooks into ref for generic member expression components', () => {
            assert.equal(transform('<Ns.Foo<T> onComponentDidMount={m} />'), 'newComponentVNode(0, Ns.Foo, null, null, { "onComponentDidMount": m });')
        })

        it('Should keep hooks as props on elements', () => {
            assert.equal(transform('<div onComponentDidMount={f} />'), 'newVNode(17, "div", null, null, { "onComponentDidMount": f });')
        })

        it('Should merge ref into the hooks when ref comes before a hook', () => {
            assert.equal(transform('<Foo ref={r} onComponentDidMount={m} />'), 'newComponentVNode(0, Foo, null, null, Object.assign({}, r, { "onComponentDidMount": m }));')
            assert.deepEqual(run('<Foo ref={r} onComponentDidMount={m} />', scope).ref, {onComponentWillMount: 'willMount', onComponentDidMount: 'didMount'})
        })

        it('Should merge ref into the hooks when ref comes after the hooks', () => {
            assert.equal(transform('<Foo onComponentDidMount={m} ref={r} />'), 'newComponentVNode(0, Foo, null, null, Object.assign({}, r, { "onComponentDidMount": m }));')
            assert.deepEqual(run('<Foo onComponentDidMount={m} ref={r} />', scope).ref, {onComponentWillMount: 'willMount', onComponentDidMount: 'didMount'})
        })

        it('Should compile ref and hooks the same in any order', () => {
            assert.equal(transform('<Foo ref={r} onComponentDidMount={m} />'), transform('<Foo onComponentDidMount={m} ref={r} />'))
        })

        it('Should merge ref with several hooks, key and children', () => {
            const vNode = run('<Foo key={i} ref={r} onComponentDidAppear={a} onComponentDidMount={b}>{i}</Foo>', scope)

            assert.deepEqual(vNode.props, {children: 1})
            assert.equal(vNode.key, 1)
            assert.deepEqual(vNode.ref, {onComponentWillMount: 'willMount', onComponentDidAppear: 'didAppear', onComponentDidMount: 'didMount'})
        })

        it('Should merge ref into the hooks of a generic component', () => {
            assert.deepEqual(run('<Foo<string> ref={r as any} onComponentDidMount={m} />', scope).ref, {onComponentWillMount: 'willMount', onComponentDidMount: 'didMount'})
        })

        it('Should move hooks next to spread props', () => {
            assert.equal(transform('<Foo {...p} onComponentDidMount={m} />'), 'normalizeProps(newComponentVNode(0, Foo, Object.assign({}, p), null, { "onComponentDidMount": m }));')
        })
    })

    // A valueless ref would be true, which is neither a callback nor a ref object
    describe('valueless ref', () => {
        it('Should reject a valueless ref on an element', () => {
            expectThrows(() => transform('<div ref />'), VALUELESS_REF_ERROR)
        })

        it('Should reject a valueless ref on a component', () => {
            expectThrows(() => transform('<Foo ref />'), VALUELESS_REF_ERROR)
        })

        it('Should reject a valueless ref next to component hooks', () => {
            expectThrows(() => transform('<Foo ref onComponentDidMount={m} />'), VALUELESS_REF_ERROR)
        })

        it('Should reject a valueless ref on a generic component', () => {
            expectThrows(() => transform('<Foo<string> ref />'), VALUELESS_REF_ERROR)
        })

        it('Should point the valueless ref error at the ref', () => {
            expectThrows(() => transform('<ul>\n  <li ref>a</li>\n</ul>'), 'file.tsx(2,7): ' + VALUELESS_REF_ERROR + '\n  1 | <ul>\n> 2 |   <li ref>a</li>\n    |       ^^^\n  3 | </ul>')
        })
    })
})
