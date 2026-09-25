import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {evaluate, renderToHTML} from './render'

// ChildFlags of inferno-vnode-flags, for $ChildFlag
const HAS_VNODE_CHILDREN = 2
const HAS_TEXT_CHILDREN = 16
const UNKNOWN_CHILDREN = 0

/*
 * Compiled JSX rendered with the real Inferno runtime. The other tests compare the generated calls, these check that
 * Inferno renders what the JSX says, which is where wrong child flags show: they drop or garble children silently.
 */
describe('Rendering with Inferno', () => {
    describe('elements', () => {
        it('Should render elements, attributes and text', () => {
            assert.equal(renderToHTML('<div className="a" title="t">text</div>'), '<div class="a" title="t">text</div>')
            assert.equal(renderToHTML('<ul><li key="1">a</li><li key="2">b</li></ul>'), '<ul><li>a</li><li>b</li></ul>')
            assert.equal(renderToHTML('<p>a {x} b</p>', {x: 1}), '<p>a 1 b</p>')
        })

        it('Should render a component with children', () => {
            const Foo = (props: any) => props.children

            assert.equal(renderToHTML('<div><Foo>text</Foo></div>', {Foo}), '<div>text</div>')
        })
    })

    // The string "null" was taken for the null keyword and dropped
    describe('the string "null"', () => {
        it('Should render null text', () => {
            assert.equal(renderToHTML('<div>null</div>'), '<div>null</div>')
        })

        it('Should render a null string expression', () => {
            assert.equal(renderToHTML('<div>{"null"}</div>'), '<div>null</div>')
        })

        it('Should render a null children prop', () => {
            assert.equal(renderToHTML('<div children="null" />'), '<div>null</div>')
        })

        it('Should render a null class name', () => {
            assert.equal(renderToHTML('<div className="null" />'), '<div class="null"></div>')
            assert.equal(renderToHTML('<div className={`null`} />'), '<div class="null"></div>')
        })

        it('Should keep a null key', () => {
            assert.equal(evaluate('<div key="null" />').key, 'null')
            assert.equal(evaluate('<Foo key="null" />', {Foo: () => null}).key, 'null')
        })

        it('Should render the null keyword as nothing', () => {
            assert.equal(renderToHTML('<div className={null}>{null}</div>'), '<div></div>')
        })
    })

    describe('Fragments with child flags', () => {
        it('Should render a dynamic child declared as text', () => {
            assert.equal(renderToHTML('<Fragment $HasTextChildren>{x}</Fragment>', {x: 'text'}), 'text')
            assert.equal(renderToHTML('<Fragment $HasTextChildren key="k">{x}</Fragment>', {x: 'text'}), 'text')
            assert.equal(renderToHTML('<Fragment $HasTextChildren>{"text"}</Fragment>'), 'text')
        })

        it('Should render a children prop declared as text', () => {
            assert.equal(renderToHTML('<Fragment $HasTextChildren children={x} />', {x: 'text'}), 'text')
            assert.equal(renderToHTML('<Fragment $HasTextChildren children="text" />'), 'text')
        })

        it('Should render an element child of a Fragment declared as text', () => {
            assert.equal(renderToHTML('<Fragment $HasTextChildren><b>x</b></Fragment>'), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasTextChildren>{<b>x</b>}</Fragment>'), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasTextChildren>{/* c */}<b>x</b></Fragment>'), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasTextChildren children=<b>x</b> />'), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasTextChildren><>text</></Fragment>'), 'text')
        })

        it('Should render a dynamic child declared as a vNode', () => {
            const x = evaluate('<b>x</b>')

            assert.equal(renderToHTML('<Fragment $HasVNodeChildren>{x}</Fragment>', {x}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren key="k">{x}</Fragment>', {x}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren>{<b>x</b>}</Fragment>'), '<b>x</b>')
        })

        it('Should render several dynamic children declared as vNodes', () => {
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren>{a}{b}</Fragment>', {a: evaluate('<i/>'), b: evaluate('<b/>')}), '<i></i><b></b>')
        })

        it('Should evaluate an overridden children prop before the children', () => {
            const calls: string[] = []
            const f = () => calls.push('f')

            assert.equal(renderToHTML('<Fragment $HasTextChildren children={f()}>{x}</Fragment>', {f, x: 'text'}), 'text')
            assert.deepEqual(calls, ['f'])
        })

        it('Should render a dynamic child as $ChildFlag declares it', () => {
            assert.equal(renderToHTML('<Fragment $ChildFlag={flag}>{x}</Fragment>', {flag: HAS_VNODE_CHILDREN, x: evaluate('<b>x</b>')}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $ChildFlag={flag}>{x}</Fragment>', {flag: HAS_TEXT_CHILDREN, x: 'text'}), 'text')
            assert.equal(renderToHTML('<Fragment $ChildFlag={flag}>{x}</Fragment>', {flag: UNKNOWN_CHILDREN, x: ['a', 'b']}), 'ab')
        })
    })

    describe('Fragment children prop strings', () => {
        it('Should render a children prop string', () => {
            assert.equal(renderToHTML('<Fragment children="text" />'), 'text')
            assert.equal(renderToHTML('<Fragment children="text" key="k" />'), 'text')
            assert.equal(renderToHTML('<Fragment children="  " />'), '  ')
        })

        it('Should render a children prop string with a child flag', () => {
            assert.equal(renderToHTML('<Fragment $HasNonKeyedChildren children="text" />'), 'text')
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren children="text" />'), 'text')
        })
    })

    // Without a child flag Inferno uses HasInvalidChildren, which renders none of the children
    describe('several children declared as vNodes', () => {
        it('Should render several dynamic children', () => {
            assert.equal(renderToHTML('<div $HasVNodeChildren>{a}{b}</div>', {a: evaluate('<i/>'), b: evaluate('<b/>')}), '<div><i></i><b></b></div>')
        })

        it('Should render a dynamic child next to whitespace', () => {
            assert.equal(renderToHTML('<div $HasVNodeChildren>{a} </div>', {a: evaluate('<i/>')}), '<div><i></i> </div>')
        })

        it('Should render a spread child', () => {
            assert.equal(renderToHTML('<div $HasVNodeChildren>{...list}</div>', {list: [evaluate('<i/>'), evaluate('<b/>')]}), '<div><i></i><b></b></div>')
        })
    })
})
