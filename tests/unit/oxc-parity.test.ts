// Cases mirrored from babel-plugin-inferno's tests/oxc-parity.test.js, which mirrors oxc's transformer conformance fixtures.
// Titles name the fixture they come from.
// - oxc tasks/transform_conformance/tests/babel-plugin-transform-react-jsx/test/fixtures/
// - oxc tasks/transform_conformance/tests/babel-plugin-transform-typescript/test/fixtures/jsx/
// - oxc tasks/transform_conformance/tests/babel-plugin-transform-arrow-functions/test/fixtures/

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {es5, expectValidJS, run, transform, transformWith, tscText} from './helpers'

describe('oxc parity', () => {
    describe('text/escapes', () => {
        it('Should decode named entities', () => {
            const code = transform('<div>&nbsp;&iexcl;&cent;&pound;&curren;&yen;&brvbar;&sect;&uml;&copy;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\u00A0\\u00A1\\u00A2\\u00A3\\u00A4\\u00A5\\u00A6\\u00A7\\u00A8\\u00A9", 16);')
            expectValidJS(code)
            assert.equal(run('<div>&nbsp;&iexcl;&cent;&pound;&curren;&yen;&brvbar;&sect;&uml;&copy;</div>').children, '\u00A0¡¢£¤¥¦§¨©')
        })

        it('Should decode invisible named entities', () => {
            const code = transform('<div>&shy; &ensp; &emsp; &thinsp; &zwnj; &zwj; &lrm; &rlm;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\u00AD \\u2002 \\u2003 \\u2009 \\u200C \\u200D \\u200E \\u200F", 16);')
            expectValidJS(code)
            assert.equal(run('<div>&shy; &ensp; &emsp; &thinsp; &zwnj; &zwj; &lrm; &rlm;</div>').children, '\u00AD \u2002 \u2003 \u2009 \u200C \u200D \u200E \u200F')
        })

        it('Should decode quote, ampersand and angle entities and keep unknown ones', () => {
            const code = transform('<div>&quot; &amp; &lt; &gt; &donkey;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\" & < > &donkey;", 16);')
            expectValidJS(code)
        })

        it('Should decode accented and currency entities', () => {
            const code = transform('<div>&Egrave; &euro;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\u00C8 \\u20AC", 16);')
            expectValidJS(code)
            assert.equal(run('<div>&Egrave; &euro;</div>').children, 'È €')
        })
    })

    describe('text/numeric-escapes', () => {
        it('Should decode hexadecimal entities up to U+10FFFF', () => {
            const code = transform('<div>&#xC; &#x41; &#x123; &#x1234; &#x10000; &#x10FFFF;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\f A \\u0123 \\u1234 \\uD800\\uDC00 \\uDBFF\\uDFFF", 16);')
            expectValidJS(code)
            assert.equal(run('<div>&#xC; &#x41; &#x123; &#x1234; &#x10000; &#x10FFFF;</div>').children, '\f A ģ ሴ 𐀀 \u{10FFFF}')
        })

        it('Should decode decimal entities up to U+10FFFF', () => {
            const code = transform('<div>&#12; &#65; &#291; &#4660; &#65536; &#1114111;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\f A \\u0123 \\u1234 \\uD800\\uDC00 \\uDBFF\\uDFFF", 16);')
            expectValidJS(code)
            assert.equal(run('<div>&#12; &#65; &#291; &#4660; &#65536; &#1114111;</div>').children, '\f A ģ ሴ 𐀀 \u{10FFFF}')
        })

        it('Should keep invalid numeric entities verbatim', () => {
            const code = transform('<div>&#xG; &#C;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&#xG; &#C;", 16);')
            expectValidJS(code)
        })
    })

    describe('text/unterminated-escapes', () => {
        it('Should keep a named entity without semicolon', () => {
            assert.equal(transform('<div>&Egrave</div>'), 'createVNode(1, "div", null, "&Egrave", 16);')
        })

        it('Should keep a named entity followed by text', () => {
            assert.equal(transform('<div>&euro xxx</div>'), 'createVNode(1, "div", null, "&euro xxx", 16);')
        })

        it('Should keep a decimal entity without semicolon', () => {
            assert.equal(transform('<div>&#123 xxx</div>'), 'createVNode(1, "div", null, "&#123 xxx", 16);')
        })

        it('Should keep a hexadecimal entity without semicolon', () => {
            assert.equal(transform('<div>&#x123 xxx</div>'), 'createVNode(1, "div", null, "&#x123 xxx", 16);')
        })
    })

    // Each whitespace run below is space, tab, space. Tabs become spaces like in Babel; oxc keeps them
    describe('text/whitespace', () => {
        it('Should keep single-line whitespace', () => {
            assert.equal(transform('<div> \t angry \t </div>'), 'createVNode(1, "div", null, "   angry   ", 16);')
        })

        it('Should keep whitespace of the first and last lines', () => {
            assert.equal(transform('<div> \t boris\ncod\ndante \t </div>'), 'createVNode(1, "div", null, "   boris cod dante   ", 16);')
        })

        it('Should drop whitespace-only first and last lines', () => {
            assert.equal(transform('<div> \t \naging\n \t </div>'), 'createVNode(1, "div", null, "aging", 16);')
        })

        it('Should keep whitespace inside a line', () => {
            assert.equal(transform('<div>\n \t bark \t club \t devil \t \n</div>'), 'createVNode(1, "div", null, "bark   club   devil", 16);')
        })
    })

    // Babel decodes entities before trimming, so babel-plugin-inferno collapses an encoded newline like a real one and
    // turns encoded tabs into spaces. This plugin decodes entities with TypeScript's JSX emit after trimming, so like tsc
    // and oxc it keeps encoded whitespace verbatim
    describe('text/newline-entities', () => {
        it('Should keep an encoded newline between words like tsc', () => {
            assert.equal(transform('<div>a&#10;b</div>'), 'createVNode(1, "div", null, "a\\nb", 16);')
            assert.equal(run('<div>a&#10;b</div>').children, tscText('<div>a&#10;b</div>'))
        })

        it('Should keep an encoded newline at a line end like tsc', () => {
            assert.equal(transform('<div>\n  a&#10;\n  b\n</div>'), 'createVNode(1, "div", null, "a\\n b", 16);')
            assert.equal(run('<div>\n  a&#10;\n  b\n</div>').children, tscText('<div>\n  a&#10;\n  b\n</div>'))
        })

        it('Should keep encoded tabs like tsc', () => {
            assert.equal(transform('<div>&#9;x&#9;</div>'), 'createVNode(1, "div", null, "\\tx\\t", 16);')
            assert.equal(run('<div>&#9;x&#9;</div>').children, tscText('<div>&#9;x&#9;</div>'))
        })
    })

    describe('text/unicode', () => {
        it('Should keep an emoji with a variation selector on its own line', () => {
            const code = transform('<h2>\n🏝\uFE0F\n</h2>')

            assert.equal(code, 'createVNode(1, "h2", null, "\\uD83C\\uDFDD\\uFE0F", 16);')
            expectValidJS(code)
            assert.equal(run('<h2>\n🏝\uFE0F\n</h2>').children, '🏝\uFE0F')
        })
    })

    describe('issues', () => {
        it('issue-6638: Should drop tab indentation of nested components', () => {
            assert.equal(transform('<Suspense fallback={"Loading..."}>\n\t<PanelGroup>\n\t\t<Panel>\n\t\t\t<A/>\n\t\t</Panel>\n\t</PanelGroup>\n</Suspense>'), 'createComponentVNode(2, Suspense, { "fallback": "Loading...", "children": createComponentVNode(2, PanelGroup, { "children": createComponentVNode(2, Panel, { "children": createComponentVNode(2, A) }) }) });')
        })

        it('issue-20669: Should ignore @jsxImportSource pragmas in comments', () => {
            assert.equal(transformWith('/** @jsxImportSource react */\n/**\n * Mentions `@jsxImportSource custom/source` in docs\n */\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\n/** @jsxImportSource react */\n/**\n * Mentions `@jsxImportSource custom/source` in docs\n */\nexport const a = createVNode(1, "div");')
        })

        // verbatimModuleSyntax is TypeScript's counterpart of Babel's onlyRemoveTypeImports
        it('issue-10956: Should ignore @jsx and @jsxRuntime pragmas with verbatimModuleSyntax', () => {
            assert.equal(transformWith('/** @jsx h */\n/** @jsxRuntime classic */\nexport const foo = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\n/** @jsx h */\n/** @jsxRuntime classic */\nexport const foo = createVNode(1, "div");')
        })

        it('issue-10956: Should add the inferno import when a type-only inferno import is elided', () => {
            assert.equal(transformWith('import type {VNode} from "inferno";\n/** @jsx h */\nexport const foo: VNode = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\n/** @jsx h */\nexport const foo = createVNode(1, "div");')
        })
    })

    describe('transform-arrow-functions/with-this-member-expression', () => {
        it('Should rewrite this in member tags inside arrow functions', () => {
            const code = transformWith('const f = function () {\n  return () => <this.foo.bar.qux />;\n};', es5)

            assert.ok(code.includes('var _this = this;'), code)
            assert.ok(code.includes('return createComponentVNode(2, _this.foo.bar.qux);'), code)
        })
    })

    describe('current behaviour (questionable)', () => {
        // oxc drops the comment, leaving a single static child
        it('static-children: Should mark a comment and an element as UnknownChildren', () => {
            assert.equal(transform('<div>{ /* comment only */ }<span/></div>'), 'createVNode(1, "div", null, createVNode(1, "span"), 0);')
        })
    })
})
