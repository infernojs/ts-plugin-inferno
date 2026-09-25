import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

describe('Special flags', () => {
    describe('flag precedence', () => {
        it('Should use text children when $HasVNodeChildren is set on text', () => {
            assert.equal(transform('<div $HasVNodeChildren>text</div>'), 'createVNode(1, "div", null, "text", 16);')
        })

        it('Should infer non keyed children when $HasVNodeChildren is set on several children', () => {
            assert.equal(transform('<div $HasVNodeChildren><a/><b/></div>'), 'createVNode(1, "div", null, [createVNode(1, "a"), createVNode(1, "b")], 4);')
        })

        it('Should use $HasKeyedChildren for static children', () => {
            assert.equal(transform('<div $HasKeyedChildren><a/><b/></div>'), 'createVNode(1, "div", null, [createVNode(1, "a"), createVNode(1, "b")], 8);')
        })

        it('Should prefer $HasKeyedChildren over $HasNonKeyedChildren', () => {
            assert.equal(transform('<div $HasKeyedChildren $HasNonKeyedChildren>{a}</div>'), 'createVNode(1, "div", null, a, 8);')
        })

        it('Should prefer $ChildFlag over other child flags', () => {
            assert.equal(transform('<div $ChildFlag={1} $HasKeyedChildren>{a}</div>'), 'createVNode(1, "div", null, a, 1);')
        })

        it('Should strip type syntax from a $ChildFlag expression', () => {
            assert.equal(transform('<div $ChildFlag={flag as ChildFlags}>{a}</div>'), 'createVNode(1, "div", null, a, flag);')
        })
    })

    describe('$ReCreate', () => {
        it('Should add the ReCreate flag to components', () => {
            assert.equal(transform('<Foo $ReCreate/>'), 'createComponentVNode(2050, Foo);')
        })

        it('Should add the ReCreate flag to generic components', () => {
            assert.equal(transform('<Foo<T> $ReCreate/>'), 'createComponentVNode(2050, Foo);')
        })

        it('Should add the ReCreate flag to input elements', () => {
            assert.equal(transform('<input $ReCreate/>'), 'createVNode(2112, "input");')
        })

        it('Should add the ReCreate flag to svg elements', () => {
            assert.equal(transform('<svg $ReCreate/>'), 'createVNode(2080, "svg");')
        })

        it('Should combine ReCreate and ContentEditable flags', () => {
            assert.equal(transform('<div $ReCreate contentEditable/>'), 'createVNode(6145, "div", null, null, 1, { "contentEditable": true });')
        })
    })

    describe('other combinations', () => {
        it('Should set text children flag without children', () => {
            assert.equal(transform('<div $HasTextChildren />'), 'createVNode(1, "div", null, null, 16);')
        })

        it('Should ignore child flags on components', () => {
            assert.equal(transform('<Foo $HasKeyedChildren>{a}</Foo>'), 'createComponentVNode(2, Foo, { "children": a });')
        })

        it('Should keep $HasVNodeChildren with a spread', () => {
            assert.equal(transform('<div {...p} $HasVNodeChildren>{a}</div>'), 'normalizeProps(createVNode(1, "div", null, a, 2, Object.assign({}, p)));')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should add the ContentEditable flag to components', () => {
            assert.equal(transform('<Foo contentEditable/>'), 'createComponentVNode(4098, Foo, { "contentEditable": true });')
        })

        it('Should let inferred non keyed children override $HasTextChildren', () => {
            assert.equal(transform('<div $HasTextChildren><a/><b/></div>'), 'createVNode(1, "div", null, [createVNode(1, "a"), createVNode(1, "b")], 4);')
        })

        it('Should pass a string $ChildFlag through as a string', () => {
            assert.equal(transform('<div $ChildFlag="1">{a}</div>'), 'createVNode(1, "div", null, a, "1");')
        })
    })
})
