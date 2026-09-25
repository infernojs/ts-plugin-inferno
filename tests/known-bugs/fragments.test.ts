// Cases from swc-plugin-inferno tests/babel_plugin_inferno/fragments.rs, ported from babel-plugin-inferno a8418df
// ("handle more edge cases combining children flags and Fragments"), that fail on the current plugin.
// Each test asserts the correct behaviour; move it to tests/unit/fragments.test.ts once it passes.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform, transformWith} from '../unit/helpers'

describe('Fragments', () => {
    describe('$HasTextChildren', () => {
        // Currently drops the child: createFragment(), and still imports createTextVNode
        it('Should compile a dynamic child into a text vNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren>{x}</Fragment>'), 'import { createFragment, createTextVNode } from "inferno";\ncreateFragment([createTextVNode(x)], 4);')
        })

        // Currently drops the child: createFragment(null, 1, "k")
        it('Should compile a dynamic child into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasTextChildren key="k">{x}</Fragment>'), 'createFragment([createTextVNode(x)], 4, "k");')
        })

        // Currently not in an array: createFragment(createTextVNode("text"), 4)
        it('Should put a string expression child in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{"text"}</Fragment>'), 'createFragment([createTextVNode("text")], 4);')
        })

        // Currently drops the child: createFragment()
        it('Should compile a children prop expression into a text vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={x} />'), 'createFragment([createTextVNode(x)], 4);')
        })

        // Currently not in an array: createFragment(createTextVNode("text"), 4)
        it('Should put a children prop string in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        // Currently crashes with "Cannot read properties of undefined (reading 'kind')"
        it('Should evaluate an overridden children prop once', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={f()}>{x}</Fragment>'), 'createFragment([(f(), createTextVNode(x))], 4);')
        })

        // Currently crashes with "Cannot read properties of undefined (reading 'kind')"
        it('Should keep an element child as a vNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren><a/></Fragment>'), 'import { createFragment, createVNode } from "inferno";\ncreateFragment([createVNode(1, "a")], 4);')
        })

        // Currently drops the child: createFragment()
        it('Should keep an element expression child as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{<a/>}</Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        // Currently drops the child: createFragment()
        it('Should keep an element child next to an empty expression as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{/* c */}<a/></Fragment>'), 'createFragment([createVNode(1, "a")], 4);')
        })

        // Currently drops the child: createFragment()
        it('Should keep an element children prop as a vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren children=<a/> />'), 'createFragment([createVNode(1, "a")], 4);')
        })
    })

    describe('$HasVNodeChildren', () => {
        // Currently child flag 4 (HasNonKeyedChildren) for a child that is not an array: createFragment(x, 4)
        it('Should pass a dynamic child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{x}</Fragment>'), 'createFragment(x, 2);')
        })

        // Currently createFragment(x, 4, "k")
        it('Should pass a dynamic child as a single vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren key="k">{x}</Fragment>'), 'createFragment(x, 2, "k");')
        })

        // Currently createFragment(createVNode(1, "a"), 4)
        it('Should pass an element expression child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{<a/>}</Fragment>'), 'createFragment(createVNode(1, "a"), 2);')
        })

        // Currently createFragment(createVNode(1, "a"), 4)
        it('Should pass an element child next to an empty expression as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{/* c */}<a/></Fragment>'), 'createFragment(createVNode(1, "a"), 2);')
        })

        // Currently createFragment((f(), x), 4)
        it('Should evaluate an overridden children prop before a dynamic child', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren children={f()}>{x}</Fragment>'), 'createFragment((f(), x), 2);')
        })
    })

    describe('string children prop', () => {
        // Currently a raw string without child flags: createFragment(["text"])
        it('Should compile a children prop string into a text vNode', () => {
            assert.equal(transformWith('<Fragment children="text" />'), 'import { createFragment, createTextVNode } from "inferno";\ncreateFragment([createTextVNode("text")], 4);')
        })

        // Currently createFragment(["text"], 1, "k")
        it('Should compile a children prop string into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment children="text" key="k" />'), 'createFragment([createTextVNode("text")], 4, "k");')
        })

        // Currently createFragment(["text"])
        it('Should compile a children prop string into a text vNode in a React.Fragment', () => {
            assert.equal(transform('<React.Fragment children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        // Currently createFragment(["  "])
        it('Should keep single-line whitespace in a children prop string', () => {
            assert.equal(transform('<Fragment children="  " />'), 'createFragment([createTextVNode("  ")], 4);')
        })

        // Currently a raw string that is not an array: createFragment("text", 4)
        it('Should put a children prop string in an array with $HasNonKeyedChildren', () => {
            assert.equal(transform('<Fragment $HasNonKeyedChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })

        // Currently createFragment("text", 8)
        it('Should put a children prop string in an array with $HasKeyedChildren', () => {
            assert.equal(transform('<Fragment $HasKeyedChildren children="text" />'), 'createFragment([createTextVNode("text")], 8);')
        })

        // Currently createFragment(["text"])
        it('Should compile a children prop string into a text vNode with $HasVNodeChildren', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren children="text" />'), 'createFragment([createTextVNode("text")], 4);')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Currently imports createTextVNode although no text vNode is created
        it('Should leave several dynamic children declared as text unwrapped and not import createTextVNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren>{x}{y}</Fragment>'), 'import { createFragment } from "inferno";\ncreateFragment([x, y], 4);')
        })
    })
})
