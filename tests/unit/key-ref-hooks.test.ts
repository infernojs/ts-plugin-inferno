import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {run, transform} from './helpers'

describe('key, ref and onComponent hooks', () => {
    describe('ref', () => {
        it('Should pass ref to an element', () => {
            assert.equal(transform('<div ref={a} />'), 'createVNode(1, "div", null, null, 1, null, null, a);')
        })

        it('Should pass ref and key to an element', () => {
            assert.equal(transform('<div ref={a} key="k" />'), 'createVNode(1, "div", null, null, 1, null, "k", a);')
        })

        it('Should pass ref to an element with dynamic children', () => {
            assert.equal(transform('<div ref={a}>{b}</div>'), 'createVNode(1, "div", null, b, 0, null, null, a);')
        })

        it('Should pass ref to a component', () => {
            assert.equal(transform('<Foo ref={r} />'), 'createComponentVNode(2, Foo, null, null, r);')
        })

        it('Should pass key and ref to a component', () => {
            assert.equal(transform('<Foo key="k" ref={r} />'), 'createComponentVNode(2, Foo, null, "k", r);')
        })

        it('Should pass a string ref', () => {
            assert.equal(transform('<div ref="stringRef" />'), 'createVNode(1, "div", null, null, 1, null, null, "stringRef");')
        })

        // Babel passes both nulls explicitly; Inferno treats omitted key and ref arguments as null
        it('Should pass null key and ref', () => {
            assert.equal(transform('<div key={null} ref={null} />'), 'createVNode(1, "div");')
        })

        it('Should pass ref and other props to a component', () => {
            assert.equal(transform('<Component ref={ref} foo="56" />'), 'createComponentVNode(2, Component, { "foo": "56" }, null, ref);')
        })

        it('Should pass every argument to a component', () => {
            assert.equal(transform('<Parent a="a" b={{b: "b"}} c={C} key="testKey" ref={testRef} />'), 'createComponentVNode(2, Parent, { "a": "a", "b": { b: "b" }, "c": C }, "testKey", testRef);')
        })

        it('Should pass key and ref to a generic component', () => {
            assert.equal(transform('<Foo<string> key="k" ref={r} />'), 'createComponentVNode(2, Foo, null, "k", r);')
        })
    })

    describe('key values', () => {
        it('Should pass an undefined key', () => {
            assert.equal(transform('<div key={undefined} />'), 'createVNode(1, "div", null, null, 1, null, undefined);')
        })

        // Babel's case uses self-closing children, see tests/known-bugs/key-ref-hooks.test.ts
        it('Should pass numeric and empty string keys', () => {
            assert.equal(transform('<div key={0}><a key=""></a><b key="x"></b></div>'), 'createVNode(1, "div", null, [createVNode(1, "a", null, null, 1, null, ""), createVNode(1, "b", null, null, 1, null, "x")], 8, null, 0);')
        })

        it('Should pass an object key', () => {
            assert.equal(transform('<div key={obj} />'), 'createVNode(1, "div", null, null, 1, null, obj);')
        })

        it('Should strip type syntax from key and ref', () => {
            assert.equal(transform('<div key={k!} ref={r as any} />'), 'createVNode(1, "div", null, null, 1, null, k, r);')
        })

        it('Should strip satisfies from a key', () => {
            assert.equal(transform('<Foo key={id satisfies string} />'), 'createComponentVNode(2, Foo, null, id);')
        })
    })

    describe('keyed children', () => {
        // Babel's case uses self-closing children, see tests/known-bugs/key-ref-hooks.test.ts
        it('Should mark mixed keyed and unkeyed children as keyed', () => {
            assert.equal(transform('<div><span key="k"></span><span></span></div>'), 'createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "k"), createVNode(1, "span")], 8);')
        })

        it('Should mark a single keyed child as a vnode child', () => {
            assert.equal(transform('<div><span key="k"/></div>'), 'createVNode(1, "div", null, createVNode(1, "span", null, null, 1, null, "k"), 2);')
        })

        // Babel's case uses self-closing children, see tests/known-bugs/key-ref-hooks.test.ts
        it('Should mark duplicate sibling keys as keyed', () => {
            assert.equal(transform('<><a key="a"></a><a key="a"></a></>'), 'createFragment([createVNode(1, "a", null, null, 1, null, "a"), createVNode(1, "a", null, null, 1, null, "a")], 8);')
        })

        it('Should not mark children as keyed when normalization is needed', () => {
            assert.equal(transform('<div>{a}<span key="k"/></div>'), 'createVNode(1, "div", null, [a, createVNode(1, "span", null, null, 1, null, "k")], 0);')
        })

        it('Should not inspect keys of component children', () => {
            assert.equal(transform('<Foo key="a"><Bar key="b"/><Bar key="c"/></Foo>'), 'createComponentVNode(2, Foo, { "children": [createComponentVNode(2, Bar, null, "b"), createComponentVNode(2, Bar, null, "c")] }, "a");')
        })

        it('Should not detect keys passed through spread', () => {
            assert.equal(transform('<div><Foo {...{key: "k"}}/><Foo {...{key: "j"}}/></div>'), 'createVNode(1, "div", null, [normalizeProps(createComponentVNode(2, Foo, Object.assign({}, { key: "k" }))), normalizeProps(createComponentVNode(2, Foo, Object.assign({}, { key: "j" })))], 4);')
        })

        it('Should mark keyed children of an element with a spread as keyed', () => {
            assert.equal(transform('<div {...p}><span key="a"></span><span key="b"></span></div>'), 'normalizeProps(createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "a"), createVNode(1, "span", null, null, 1, null, "b")], 8, Object.assign({}, p)));')
        })
    })

    describe('onComponent hooks', () => {
        const r = {onComponentWillMount: 'willMount'}
        const scope = {Foo: 'Foo', r, m: 'didMount', a: 'didAppear', b: 'didMount', i: 1}

        it('Should move every onComponent hook into ref', () => {
            assert.equal(transform('<Foo onComponentWillMount={a} onComponentWillUnmount={b} onComponentShouldUpdate={c} onComponentWillUpdate={d} onComponentDidUpdate={e} />'), 'createComponentVNode(2, Foo, null, null, { "onComponentWillMount": a, "onComponentWillUnmount": b, "onComponentShouldUpdate": c, "onComponentWillUpdate": d, "onComponentDidUpdate": e });')
        })

        it('Should move hooks into ref for member expression components', () => {
            assert.equal(transform('<Foo.Bar onComponentDidMount={a} />'), 'createComponentVNode(2, Foo.Bar, null, null, { "onComponentDidMount": a });')
        })

        it('Should move hooks into ref for generic member expression components', () => {
            assert.equal(transform('<Ns.Foo<T> onComponentDidMount={m} />'), 'createComponentVNode(2, Ns.Foo, null, null, { "onComponentDidMount": m });')
        })

        it('Should keep hooks as props on elements', () => {
            assert.equal(transform('<div onComponentDidMount={f} />'), 'createVNode(1, "div", null, null, 1, { "onComponentDidMount": f });')
        })

        it('Should merge ref into the hooks when ref comes before a hook', () => {
            assert.equal(transform('<Foo ref={r} onComponentDidMount={m} />'), 'createComponentVNode(2, Foo, null, null, Object.assign({}, r, { "onComponentDidMount": m }));')
            assert.deepEqual(run('<Foo ref={r} onComponentDidMount={m} />', scope).ref, {onComponentWillMount: 'willMount', onComponentDidMount: 'didMount'})
        })

        it('Should merge ref into the hooks when ref comes after the hooks', () => {
            assert.equal(transform('<Foo onComponentDidMount={m} ref={r} />'), 'createComponentVNode(2, Foo, null, null, Object.assign({}, r, { "onComponentDidMount": m }));')
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
            assert.equal(transform('<Foo {...p} onComponentDidMount={m} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p), null, { "onComponentDidMount": m }));')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel passes true as ref
        it('Should drop a valueless ref', () => {
            assert.equal(transform('<div ref />'), 'createVNode(1, "div");')
        })
    })
})
