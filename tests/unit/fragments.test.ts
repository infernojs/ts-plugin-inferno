import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows, transform, transformWith} from './helpers'

describe('Fragments', () => {
    describe('keyed fragments', () => {
        it('Should create a keyed empty self-closing Fragment', () => {
            assert.equal(transform('<Fragment key="k"/>'), 'newFragment(272, null, "k");')
        })

        it('Should create a keyed empty Fragment', () => {
            assert.equal(transform('<Fragment key="k"></Fragment>'), 'newFragment(272, null, "k");')
        })

        it('Should create a keyed empty React.Fragment', () => {
            assert.equal(transform('<React.Fragment key={id!} />'), 'newFragment(272, null, id);')
        })

        it('Should create a keyed Fragment with text', () => {
            assert.equal(transform('<Fragment key="k">text</Fragment>'), 'newFragment(260, [newTextVNode("text")], "k");')
        })

        it('Should mark keyed fragments as keyed children', () => {
            assert.equal(transform('<div><Fragment key="a"><b/></Fragment><Fragment key="c"><d/></Fragment></div>'), 'newVNode(33, "div", null, [newFragment(260, [newVNode(17, "b")], "a"), newFragment(260, [newVNode(17, "d")], "c")]);')
        })

        it('Should throw for an empty Fragment with $HasKeyedChildren', () => {
            expectThrows(() => transform('<Fragment $HasKeyedChildren/>'), '$HasKeyedChildren needs an array of elements or components that all have a key, but there are no children.')
        })

        it('Should create a keyed Fragment with dynamic children', () => {
            assert.equal(transform('<Fragment key="k">{a}</Fragment>'), 'newFragment(256, a, "k");')
        })

        it('Should create a keyed React.Fragment with non keyed children', () => {
            assert.equal(transform('<React.Fragment key="k"><a/><b/></React.Fragment>'), 'newFragment(260, [newVNode(17, "a"), newVNode(17, "b")], "k");')
        })

        it('Should strip a type assertion from a Fragment key', () => {
            assert.equal(transform('<Fragment key={k as string}><a/></Fragment>'), 'newFragment(260, [newVNode(17, "a")], k);')
        })
    })

    // Cases from swc-plugin-inferno tests/babel_plugin_inferno/fragments.rs, ported from babel-plugin-inferno a8418df
    describe('$HasTextChildren', () => {
        it('Should compile static text into a text vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren>text</Fragment>'), 'newFragment(260, [newTextVNode("text")]);')
        })

        it('Should throw for $HasTextChildren without children', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren />'), '$HasTextChildren needs one text child, but there are no children.')
        })

        it('Should throw for $HasTextChildren on a null children prop', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren children={null} />'), '$HasTextChildren needs one text child, but the child is null, which renders nothing.')
        })

        it('Should compile a dynamic child into a text vNode', () => {
            assert.equal(transformWith('<Fragment $HasTextChildren>{x}</Fragment>'), 'import { newFragment, newTextVNode } from "inferno";\nnewFragment(260, [newTextVNode(x)]);')
        })

        it('Should compile a dynamic child into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasTextChildren key="k">{x}</Fragment>'), 'newFragment(260, [newTextVNode(x)], "k");')
        })

        it('Should put a string expression child in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren>{"text"}</Fragment>'), 'newFragment(260, [newTextVNode("text")]);')
        })

        it('Should compile a children prop expression into a text vNode', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={x} />'), 'newFragment(260, [newTextVNode(x)]);')
        })

        it('Should put a children prop string in an array', () => {
            assert.equal(transform('<Fragment $HasTextChildren children="text" />'), 'newFragment(260, [newTextVNode("text")]);')
        })

        it('Should evaluate an overridden children prop once', () => {
            assert.equal(transform('<Fragment $HasTextChildren children={f()}>{x}</Fragment>'), 'newFragment(260, [(f(), newTextVNode(x))]);')
        })

        it('Should throw for $HasTextChildren on an element child', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren><a/></Fragment>'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        it('Should throw for $HasTextChildren on an element expression child', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren>{<a/>}</Fragment>'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        it('Should throw for $HasTextChildren on an element child next to an empty expression', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren>{/* c */}<a/></Fragment>'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        it('Should throw for $HasTextChildren on an element children prop', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren children=<a/> />'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        it('Should throw for several dynamic children declared as text', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren>{x}{y}</Fragment>'), '$HasTextChildren needs one text child, but there are 2 children.')
        })

        it('Should throw for $HasTextChildren on a nested Fragment child', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren><></></Fragment>'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        it('Should throw for $HasTextChildren on a Fragment expression child', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren>{<>t</>}</Fragment>'), '$HasTextChildren needs one text child, but the child is an element.')
        })

        // A spread child is several children, which are not one text child
        it('Should throw for $HasTextChildren on a spread child', () => {
            expectThrows(() => transform('<Fragment $HasTextChildren>{...x}</Fragment>'), '$HasTextChildren needs one text child, but the child is a spread, which makes an array.')
        })
    })

    describe('$HasVNodeChildren', () => {
        it('Should put a static element child in an array', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren><a/></Fragment>'), 'newFragment(260, [newVNode(17, "a")]);')
        })

        it('Should throw for $HasVNodeChildren on static text', () => {
            expectThrows(() => transform('<Fragment $HasVNodeChildren>text</Fragment>'), '$HasVNodeChildren needs one element or component child, but the child is text.')
        })

        it('Should pass a dynamic child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{x}</Fragment>'), 'newFragment(264, x);')
        })

        it('Should pass a dynamic child as a single vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren key="k">{x}</Fragment>'), 'newFragment(264, x, "k");')
        })

        it('Should pass an element expression child as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{<a/>}</Fragment>'), 'newFragment(264, newVNode(17, "a"));')
        })

        it('Should pass an element child next to an empty expression as a single vNode', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren>{/* c */}<a/></Fragment>'), 'newFragment(264, newVNode(17, "a"));')
        })

        it('Should evaluate an overridden children prop before a dynamic child', () => {
            assert.equal(transform('<Fragment $HasVNodeChildren children={f()}>{x}</Fragment>'), 'newFragment(264, (f(), x));')
        })

        it('Should throw for several dynamic children declared as a vNode', () => {
            expectThrows(() => transform('<Fragment $HasVNodeChildren>{x}{y}</Fragment>'), '$HasVNodeChildren needs one element or component child, but there are 2 children.')
        })

        it('Should throw for a spread child declared as a vNode', () => {
            expectThrows(() => transform('<Fragment $HasVNodeChildren>{...x}</Fragment>'), '$HasVNodeChildren needs one element or component child, but the child is a spread, which makes an array.')
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

        // A ChildFlags number is packed into the flags of newFragment, the child is passed as written like for createFragment
        it('Should pass a dynamic child as it is for a numeric $ChildFlag', () => {
            assert.equal(transform('<Fragment $ChildFlag={16}>{a}</Fragment>'), 'newFragment(258, a);')
            assert.equal(transform('<Fragment $ChildFlag={2} key="k">{a}</Fragment>'), 'newFragment(264, a, "k");')
            assert.equal(transform('<Fragment $ChildFlag={16} children={a} />'), 'newFragment(258, a);')
        })
    })

    describe('string children prop', () => {
        it('Should create an empty Fragment for an empty children prop string', () => {
            assert.equal(transformWith('<Fragment children="" />'), 'import { newFragment } from "inferno";\nnewFragment(272);')
        })

        it('Should compile a children prop string into a text vNode', () => {
            assert.equal(transformWith('<Fragment children="text" />'), 'import { newFragment, newTextVNode } from "inferno";\nnewFragment(260, [newTextVNode("text")]);')
        })

        it('Should compile a children prop string into a text vNode in a keyed Fragment', () => {
            assert.equal(transform('<Fragment children="text" key="k" />'), 'newFragment(260, [newTextVNode("text")], "k");')
        })

        it('Should compile a children prop string into a text vNode in a React.Fragment', () => {
            assert.equal(transform('<React.Fragment children="text" />'), 'newFragment(260, [newTextVNode("text")]);')
        })

        it('Should keep single-line whitespace in a children prop string', () => {
            assert.equal(transform('<Fragment children="  " />'), 'newFragment(260, [newTextVNode("  ")]);')
        })

        it('Should throw for a children prop string with $HasNonKeyedChildren', () => {
            expectThrows(() => transform('<Fragment $HasNonKeyedChildren children="text" />'), '$HasNonKeyedChildren needs an array of elements or components, but the child is text.')
        })

        it('Should throw for a children prop string with $HasKeyedChildren', () => {
            expectThrows(() => transform('<Fragment $HasKeyedChildren children="text" />'), '$HasKeyedChildren needs an array of elements or components that all have a key, but the child is text.')
        })

        it('Should throw for a children prop string with $HasVNodeChildren', () => {
            expectThrows(() => transform('<Fragment $HasVNodeChildren children="text" />'), '$HasVNodeChildren needs one element or component child, but the child is text.')
        })
    })

    describe('fragment placement', () => {
        it('Should compile an empty React.Fragment inside an element', () => {
            assert.equal(transform('<div><React.Fragment /></div>'), 'newVNode(9, "div", null, newFragment(272));')
        })

        it('Should compile a fragment as component children', () => {
            assert.equal(transform('<Foo><>{a}</></Foo>'), 'newComponentVNode(0, Foo, { "children": newFragment(256, a) });')
        })

        it('Should compile a fragment inside an element next to text', () => {
            assert.equal(transform('<div>text<>{a}</></div>'), 'newVNode(5, "div", null, [newTextVNode("text"), newFragment(256, a)]);')
        })

        it('Should compile a fragment as children of a generic component', () => {
            assert.equal(transform('<Foo<string>><>{a}</></Foo>'), 'newComponentVNode(0, Foo, { "children": newFragment(256, a) });')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel drops the spread without normalizeProps; normalizeProps is a no-op on a fragment, which has no props
        it('Should drop a spread on Fragment', () => {
            assert.equal(transform('<Fragment {...p}>x</Fragment>'), 'normalizeProps(newFragment(260, [newTextVNode("x")]));')
        })

        it('Should drop ref on Fragment', () => {
            assert.equal(transform('<Fragment ref={r}>x</Fragment>'), 'newFragment(260, [newTextVNode("x")]);')
        })

        it('Should drop other props on React.Fragment', () => {
            assert.equal(transform('<React.Fragment a={1}>x</React.Fragment>'), 'newFragment(260, [newTextVNode("x")]);')
        })

    })
})
