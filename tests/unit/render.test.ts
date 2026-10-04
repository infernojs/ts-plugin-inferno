import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows} from './helpers'
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

        // The JSX shows that the child is no text, so the plugin rejects the flag instead of compiling around it
        it('Should reject an element child of a Fragment declared as text', () => {
            const message = '$HasTextChildren needs one text child, but the child is an element.'

            expectThrows(() => renderToHTML('<Fragment $HasTextChildren><b>x</b></Fragment>'), message)
            expectThrows(() => renderToHTML('<Fragment $HasTextChildren>{<b>x</b>}</Fragment>'), message)
            expectThrows(() => renderToHTML('<Fragment $HasTextChildren>{/* c */}<b>x</b></Fragment>'), message)
            expectThrows(() => renderToHTML('<Fragment $HasTextChildren children=<b>x</b> />'), message)
            expectThrows(() => renderToHTML('<Fragment $HasTextChildren><>text</></Fragment>'), message)
        })

        it('Should render a dynamic child declared as a vNode', () => {
            const x = evaluate('<b>x</b>')

            assert.equal(renderToHTML('<Fragment $HasVNodeChildren>{x}</Fragment>', {x}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren key="k">{x}</Fragment>', {x}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $HasVNodeChildren>{<b>x</b>}</Fragment>'), '<b>x</b>')
        })

        it('Should reject several dynamic children declared as a vNode', () => {
            expectThrows(() => renderToHTML('<Fragment $HasVNodeChildren>{a}{b}</Fragment>', {a: evaluate('<i/>'), b: evaluate('<b/>')}), '$HasVNodeChildren needs one element or component child, but there are 2 children.')
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

        it('Should render a dynamic child as a numeric $ChildFlag declares it', () => {
            assert.equal(renderToHTML('<Fragment $ChildFlag={2}>{x}</Fragment>', {x: evaluate('<b>x</b>')}), '<b>x</b>')
            assert.equal(renderToHTML('<Fragment $ChildFlag={16}>{x}</Fragment>', {x: 'text'}), 'text')
            assert.equal(renderToHTML('<div $ChildFlag={16}>{x}</div>', {x: 'text'}), '<div>text</div>')
        })
    })

    describe('Fragment children prop strings', () => {
        it('Should render a children prop string', () => {
            assert.equal(renderToHTML('<Fragment children="text" />'), 'text')
            assert.equal(renderToHTML('<Fragment children="text" key="k" />'), 'text')
            assert.equal(renderToHTML('<Fragment children="  " />'), '  ')
        })

        it('Should reject a children prop string with a child flag for vNodes', () => {
            expectThrows(() => renderToHTML('<Fragment $HasNonKeyedChildren children="text" />'), '$HasNonKeyedChildren needs an array of elements or components, but the child is text.')
            expectThrows(() => renderToHTML('<Fragment $HasVNodeChildren children="text" />'), '$HasVNodeChildren needs one element or component child, but the child is text.')
        })
    })

    // $HasVNodeChildren declares a single vNode, so the plugin rejects several children instead of rendering them wrong
    describe('several children declared as vNodes', () => {
        const message = '$HasVNodeChildren needs one element or component child, but '

        it('Should reject several dynamic children', () => {
            expectThrows(() => renderToHTML('<div $HasVNodeChildren>{a}{b}</div>', {a: evaluate('<i/>'), b: evaluate('<b/>')}), message + 'there are 2 children.')
        })

        it('Should reject a dynamic child next to whitespace', () => {
            expectThrows(() => renderToHTML('<div $HasVNodeChildren>{a} </div>', {a: evaluate('<i/>')}), message + 'there are 2 children.')
        })

        it('Should reject a spread child', () => {
            expectThrows(() => renderToHTML('<div $HasVNodeChildren>{...list}</div>', {list: [evaluate('<i/>'), evaluate('<b/>')]}), message + 'the child is a spread, which makes an array.')
        })

        it('Should render several dynamic children declared as non keyed', () => {
            assert.equal(renderToHTML('<div $HasNonKeyedChildren>{a}{b}</div>', {a: evaluate('<i/>'), b: evaluate('<b/>')}), '<div><i></i><b></b></div>')
            assert.equal(renderToHTML('<div $HasNonKeyedChildren>{...list}</div>', {list: [evaluate('<i/>'), evaluate('<b/>')]}), '<div><i></i><b></b></div>')
        })
    })
})
