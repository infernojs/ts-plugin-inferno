import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform, transformWith} from './helpers'

describe('Fragments', () => {
    describe('keyed fragments', () => {
        it('Should create a keyed empty self-closing Fragment', () => {
            assert.equal(transform('<Fragment key="k"/>'), 'createFragment(null, 1, "k");')
        })

        it('Should create a keyed empty Fragment', () => {
            assert.equal(transform('<Fragment key="k"></Fragment>'), 'createFragment(null, 1, "k");')
        })

        it('Should create a keyed empty React.Fragment', () => {
            assert.equal(transform('<React.Fragment key={id!} />'), 'createFragment(null, 1, id);')
        })

        it('Should create a keyed Fragment with text', () => {
            assert.equal(transform('<Fragment key="k">text</Fragment>'), 'createFragment([createTextVNode("text")], 4, "k");')
        })

        it('Should mark keyed fragments as keyed children', () => {
            assert.equal(transform('<div><Fragment key="a"><b/></Fragment><Fragment key="c"><d/></Fragment></div>'), 'createVNode(1, "div", null, [createFragment([createVNode(1, "b")], 4, "a"), createFragment([createVNode(1, "d")], 4, "c")], 8);')
        })

        it('Should create an empty Fragment with $HasKeyedChildren', () => {
            assert.equal(transform('<Fragment $HasKeyedChildren/>'), 'createFragment();')
        })

        it('Should create a keyed Fragment with dynamic children', () => {
            assert.equal(transform('<Fragment key="k">{a}</Fragment>'), 'createFragment(a, 0, "k");')
        })

        it('Should create a keyed React.Fragment with non keyed children', () => {
            assert.equal(transform('<React.Fragment key="k"><a/><b/></React.Fragment>'), 'createFragment([createVNode(1, "a"), createVNode(1, "b")], 4, "k");')
        })

        it('Should strip a type assertion from a Fragment key', () => {
            assert.equal(transform('<Fragment key={k as string}><a/></Fragment>'), 'createFragment([createVNode(1, "a")], 4, k);')
        })
    })

    // Cases from swc-plugin-inferno tests/babel_plugin_inferno/fragments.rs, ported from babel-plugin-inferno a8418df
    describe('$HasTextChildren', () => {
        it('Should compile static text into a text vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>text</Fragment>'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should not import createTextVNode without children', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren />'), 'import { createFragment } from "inferno";\ncreateFragment();')
        })

        it('Should not import createTextVNode for a null children prop', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren children={null} />'), 'import { createFragment } from "inferno";\ncreateFragment();')
        })

        it('Should compile a dynamic child into a text vNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren>{x}</Fragment>'), 'import { createFragment, createTextVNode } from "inferno";\ncreateFragment([createTextVNode(x)], 4);')
        })

        it('Should compile a dynamic child into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasTextChildren key="k">{x}</Fragment>'), 'createFragment([createTextVNode(x)], 4, "k");')
        })

        it('Should put a string expression child in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{"text"}</Fragment>'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should compile a children prop expression into a text vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={x} />'), 'createFragment([createTextVNode(x)], 4);')
        })

        it('Should put a children prop string in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should evaluate an overridden children prop once', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={f()}>{x}</Fragment>'), 'createFragment([(f(), createTextVNode(x))], 4);')
        })

        it('Should keep an element child as a vNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren><a/></Fragment>'), 'import { createFragment, createVNode } from "inferno";\ncreateFragment([createVNode(1, "a")], 4);')
        })

        it('Should keep an element expression child as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{<a/>}</Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        it('Should keep an element child next to an empty expression as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{/* c */}<a/></Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        it('Should keep an element children prop as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren children=<a/> />'), 'createFragment([createVNode(1, "a")], 4);')
        })

        it('Should not import createTextVNode for several dynamic children declared as text', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren>{x}{y}</Fragment>'), 'import { createFragment } from "inferno";\ncreateFragment([x, y], 4);')
        })

        it('Should keep a nested Fragment child as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren><></></Fragment>'), 'createFragment([createFragment()], 4);')
        })

        it('Should keep a Fragment expression child as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{<>t</>}</Fragment>'), 'createFragment([createFragment([createTextVNode("t")], 4)], 4);')
        })

        // A spread child is several children, which are not wrapped in text vNodes
        it('Should keep a spread child as it is', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{...x}</Fragment>'), 'createFragment([...x], 4);')
        })
    })

    describe('$HasVNodeChildren', () => {
        it('Should put a static element child in an array', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren><a/></Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        it('Should compile static text into a text vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>text</Fragment>'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should pass a dynamic child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{x}</Fragment>'), 'createFragment(x, 2);')
        })

        it('Should pass a dynamic child as a single vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren key="k">{x}</Fragment>'), 'createFragment(x, 2, "k");')
        })

        it('Should pass an element expression child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{<a/>}</Fragment>'), 'createFragment(createVNode(1, "a"), 2);')
        })

        it('Should pass an element child next to an empty expression as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{/* c */}<a/></Fragment>'), 'createFragment(createVNode(1, "a"), 2);')
        })

        it('Should evaluate an overridden children prop before a dynamic child', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren children={f()}>{x}</Fragment>'), 'createFragment((f(), x), 2);')
        })

        // Without a child flag Inferno would use HasInvalidChildren, which renders none of the children
        it('Should pass several dynamic children as non keyed vNodes', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{x}{y}</Fragment>'), 'createFragment([x, y], 4);')
        })

        it('Should pass a spread child as non keyed vNodes', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{...x}</Fragment>'), 'createFragment([...x], 4);')
        })
    })

    /*
     * $ChildFlag declares the shape of the children at runtime and createFragment uses the flag as it is, so a dynamic
     * child is passed as written like on elements: in an array it would only work with UnknownChildren.
     */
    describe('$ChildFlag', () => {
        it('Should pass a dynamic child as it is', () => {
            assert.equal(transform('<Fragment $ChildFlag={x}>{a}</Fragment>'), 'createFragment(a, x);')
        })

        it('Should pass a dynamic child as it is in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $ChildFlag={x} key="k">{a}</Fragment>'), 'createFragment(a, x, "k");')
        })

        it('Should pass a children prop expression as it is', () => {
            assert.equal(transform('<Fragment $ChildFlag={x} children={a} />'), 'createFragment(a, x);')
        })

        it('Should pass several dynamic children in an array', () => {
            assert.equal(transform('<Fragment $ChildFlag={x}>{a}{b}</Fragment>'), 'createFragment([a, b], x);')
        })
    })

    describe('string children prop', () => {
        it('Should create an empty Fragment for an empty children prop string', () => {
            assert.equal(transformWith('<Fragment children="" />'), 'import { createFragment } from "inferno";\ncreateFragment();')
        })

        it('Should compile a children prop string into a text vNode', () => {
            assert.equal(transformWith('<Fragment children="text" />'), 'import { createFragment, createTextVNode } from "inferno";\ncreateFragment([createTextVNode("text")], 4);')
        })

        it('Should compile a children prop string into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment children="text" key="k" />'), 'createFragment([createTextVNode("text")], 4, "k");')
        })

        it('Should compile a children prop string into a text vNode in a React.Fragment', () => {
            assert.equal(transform('<React.Fragment children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should keep single-line whitespace in a children prop string', () => {
            assert.equal(transform('<Fragment children="  " />'), 'createFragment([createTextVNode("  ")], 4);')
        })

        it('Should put a children prop string in an array with $HasNonKeyedChildren', () => {
            assert.equal(transform('<Fragment $HasNonKeyedChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        it('Should put a children prop string in an array with $HasKeyedChildren', () => {
            assert.equal(transform('<Fragment $HasKeyedChildren children="text" />'), 'createFragment([createTextVNode("text")], 8);')
        })

        it('Should compile a children prop string into a text vNode with $HasVNodeChildren', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })
    })

    describe('fragment placement', () => {
        it('Should compile an empty React.Fragment inside an element', () => {
            assert.equal(transform('<div><React.Fragment /></div>'), 'createVNode(1, "div", null, createFragment(), 2);')
        })

        it('Should compile a fragment as component children', () => {
            assert.equal(transform('<Foo><>{a}</></Foo>'), 'createComponentVNode(2, Foo, { "children": createFragment(a, 0) });')
        })

        it('Should compile a fragment inside an element next to text', () => {
            assert.equal(transform('<div>text<>{a}</></div>'), 'createVNode(1, "div", null, [createTextVNode("text"), createFragment(a, 0)], 4);')
        })

        it('Should compile a fragment as children of a generic component', () => {
            assert.equal(transform('<Foo<string>><>{a}</></Foo>'), 'createComponentVNode(2, Foo, { "children": createFragment(a, 0) });')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel drops the spread without normalizeProps; normalizeProps is a no-op on a fragment, which has no props
        it('Should drop a spread on Fragment', () => {
            assert.equal(transform('<Fragment {...p}>x</Fragment>'), 'normalizeProps(createFragment([createTextVNode("x")], 4));')
        })

        it('Should drop ref on Fragment', () => {
            assert.equal(transform('<Fragment ref={r}>x</Fragment>'), 'createFragment([createTextVNode("x")], 4);')
        })

        it('Should drop other props on React.Fragment', () => {
            assert.equal(transform('<React.Fragment a={1}>x</React.Fragment>'), 'createFragment([createTextVNode("x")], 4);')
        })

    })
})
