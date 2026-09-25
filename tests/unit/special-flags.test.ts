import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows, transform} from './helpers'

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

        it('Should prefer $Flags over $ReCreate and contentEditable', () => {
            assert.equal(transform('<div $ReCreate contentEditable $Flags={9}/>'), 'createVNode(9, "div", null, null, 1, { "contentEditable": true });')
        })

        it('Should use a $Flags expression as the flags of a generic component', () => {
            assert.equal(transform('<Foo<T> $Flags={flags as number} />'), 'createComponentVNode(flags, Foo);')
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

        it('Should keep $Flags with a spread', () => {
            assert.equal(transform('<div $Flags={1} {...p}/>'), 'normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, p)));')
        })

        // Fragments have no flags argument, like babel the $Flags prop is dropped
        it('Should drop $Flags on a Fragment', () => {
            assert.equal(transform('<Fragment $Flags={1}>x</Fragment>'), 'createFragment([createTextVNode("x")], 4);')
        })

        it('Should keep $HasVNodeChildren with a spread', () => {
            assert.equal(transform('<div {...p} $HasVNodeChildren>{a}</div>'), 'normalizeProps(createVNode(1, "div", null, a, 2, Object.assign({}, p)));')
        })
    })

    // Without a child flag Inferno would use HasInvalidChildren, which renders none of the children
    describe('several children declared as vNodes', () => {
        it('Should pass several dynamic children as non keyed vNodes', () => {
            assert.equal(transform('<div $HasVNodeChildren>{a}{b}</div>'), 'createVNode(1, "div", null, [a, b], 4);')
        })

        it('Should pass a dynamic child next to whitespace as non keyed vNodes', () => {
            assert.equal(transform('<div $HasVNodeChildren>{a} </div>'), 'createVNode(1, "div", null, [a, createTextVNode(" ")], 4);')
        })

        it('Should pass a spread child as non keyed vNodes', () => {
            assert.equal(transform('<div $HasVNodeChildren>{...a}</div>'), 'createVNode(1, "div", null, [...a], 4);')
        })

        it('Should pass an array children prop as non keyed vNodes', () => {
            assert.equal(transform('<div $HasVNodeChildren children={[a, b]} />'), 'createVNode(1, "div", null, [a, b], 4);')
        })

        it('Should keep a single dynamic child as a vNode', () => {
            assert.equal(transform('<div $HasVNodeChildren>{a}</div>'), 'createVNode(1, "div", null, a, 2);')
        })
    })

    // A valueless flag was passed as true, which Inferno reads as flag 1: HasInvalidChildren drops the children and
    // HtmlElement turns a component into an element
    describe('valueless flags', () => {
        it('Should reject a valueless $ChildFlag', () => {
            expectThrows(() => transform('<div $ChildFlag>{a}</div>'), 'file.tsx(1,6): Please provide an explicit $ChildFlag value, e.g. $ChildFlag={flags}.')
        })

        it('Should reject a valueless $Flags', () => {
            expectThrows(() => transform('<Foo $Flags />'), 'file.tsx(1,6): Please provide an explicit $Flags value, e.g. $Flags={flags}.')
        })

        it('Should reject an empty $ChildFlag expression', () => {
            expectThrows(() => transform('<div $ChildFlag={/* flags */}>{a}</div>'), 'Please provide an explicit $ChildFlag value')
        })

        it('Should reject an empty $Flags expression', () => {
            expectThrows(() => transform('<div $Flags={}/>'), 'Please provide an explicit $Flags value')
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
