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
    })

    describe('$HasVNodeChildren', () => {
        it('Should put a static element child in an array', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren><a/></Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        it('Should compile static text into a text vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>text</Fragment>'), 'createFragment([createTextVNode("text")], 4);')
        })
    })

    describe('string children prop', () => {
        it('Should create an empty Fragment for an empty children prop string', () => {
            assert.equal(transformWith('<Fragment children="" />'), 'import { createFragment } from "inferno";\ncreateFragment();')
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

        it('Should wrap a dynamic child in an array when $ChildFlag is an expression', () => {
            assert.equal(transform('<Fragment $ChildFlag={x}>{a}</Fragment>'), 'createFragment([a], x);')
        })
    })
})
