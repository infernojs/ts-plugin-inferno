import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform, expectValidJS, run} from './helpers'

// TypeScript prints non-ASCII characters of synthesized string literals as \uXXXX escapes, run() checks the runtime value

describe('Entities and strings', () => {
    describe('entities in text', () => {
        it('Should decode &nbsp;', () => {
            const code = transform('<div>&nbsp;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\u00A0", 16);')
            assert.equal(run('<div>&nbsp;</div>').children, '\xA0')
            expectValidJS(code)
        })

        it('Should decode &amp; &lt; &gt; &quot;', () => {
            const code = transform('<div>&amp;&lt;&gt;&quot;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&<>\\"", 16);')
            expectValidJS(code)
        })

        it('Should decode decimal numeric entities', () => {
            const code = transform('<div>&#123;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "{", 16);')
            expectValidJS(code)
        })

        it('Should decode hexadecimal numeric entities', () => {
            const code = transform('<div>&#x20;a</div>')

            assert.equal(code, 'createVNode(1, "div", null, " a", 16);')
            expectValidJS(code)
        })

        it('Should decode &#0000; to a NUL character', () => {
            const code = transform('<div>&#0000;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\0", 16);')
            expectValidJS(code)
        })

        it('Should decode &#11; to a vertical tab', () => {
            assert.equal(transform('<div>&#11;</div>'), 'createVNode(1, "div", null, "\\v", 16);')
        })

        it('Should keep a numeric entity outside of Unicode verbatim', () => {
            assert.equal(transform('<div>&#x110000;</div>'), 'createVNode(1, "div", null, "&#x110000;", 16);')
        })

        it('Should keep unknown entities verbatim', () => {
            const code = transform('<div>&nosuch;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&nosuch;", 16);')
            expectValidJS(code)
        })

        it('Should keep entity-like text verbatim', () => {
            const code = transform('<div>&ampr;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&ampr;", 16);')
            expectValidJS(code)
        })

        it('Should not resolve Object.prototype names as entities', () => {
            const code = transform('<div>&valueOf;</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&valueOf;", 16);')
            expectValidJS(code)
        })

        it('Should keep entities without a terminating semicolon verbatim', () => {
            const code = transform('<div>&Egrave &#123 &#x123</div>')

            assert.equal(code, 'createVNode(1, "div", null, "&Egrave &#123 &#x123", 16);')
            expectValidJS(code)
        })
    })

    describe('unicode text', () => {
        it('Should keep emoji and accented characters', () => {
            const code = transform('<div>😀 ünïcödé</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\uD83D\\uDE00 \\u00FCn\\u00EFc\\u00F6d\\u00E9", 16);')
            assert.equal(run('<div>😀 ünïcödé</div>').children, '😀 ünïcödé')
            expectValidJS(code)
        })

        it('Should keep CJK text', () => {
            const code = transform('<div>日本語</div>')

            assert.equal(code, 'createVNode(1, "div", null, "\\u65E5\\u672C\\u8A9E", 16);')
            assert.equal(run('<div>日本語</div>').children, '日本語')
            expectValidJS(code)
        })
    })

    describe('backslashes in text', () => {
        it('Should keep backslashes in text literal', () => {
            const code = transform('<div>C:\\temp\\new</div>')

            assert.equal(code, 'createVNode(1, "div", null, "C:\\\\temp\\\\new", 16);')
            expectValidJS(code)
        })

        it('Should not parse \\u escapes in text', () => {
            const code = transform('<div>this should not parse as unicode: \\u00a0</div>')

            assert.equal(code, 'createVNode(1, "div", null, "this should not parse as unicode: \\\\u00a0", 16);')
            expectValidJS(code)
        })
    })

    describe('string attribute values', () => {
        it('Should keep a plain attribute string', () => {
            const code = transform('<div title="plain" />')

            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "plain" });')
            expectValidJS(code)
        })

        it('Should keep an empty attribute string', () => {
            const code = transform('<div title="" />')

            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "" });')
            expectValidJS(code)
        })

        it('Should keep non-ASCII characters in attribute strings', () => {
            const code = transform('<div title="ünïcödé 😀" />')

            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "\\u00FCn\\u00EFc\\u00F6d\\u00E9 \\uD83D\\uDE00" });')
            assert.equal(run('<div title="ünïcödé 😀" />').props.title, 'ünïcödé 😀')
            expectValidJS(code)
        })

        it('Should print a single-quoted attribute string with double quotes', () => {
            const code = transform('<div title=\'it"s\' />')

            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "it\\"s" });')
            expectValidJS(code)
        })

        // Entities are only decoded in JSX strings, a JavaScript string in an expression container is kept as is
        it('Should keep entity text in an expression container string verbatim', () => {
            assert.equal(transform('<div title={"a&amp;b"} />'), 'createVNode(1, "div", null, null, 1, { "title": "a&amp;b" });')
        })

        it('Should keep entity text in an expression container child verbatim', () => {
            assert.equal(transform('<div>{"a&amp;b"}</div>'), 'createVNode(1, "div", null, "a&amp;b", 0);')
        })
    })

    describe('attribute strings with line breaks', () => {
        it('Should compile a multi-line className', () => {
            const code = transform('<div className="flex\n    items-center\n    gap-2">x</div>')

            expectValidJS(code)
            assert.equal(code, 'createVNode(1, "div", "flex items-center gap-2", "x", 16);')
        })

        it('Should compile a multi-line svg path (babel-parser regression/7)', () => {
            const code = transform('<path d="M230 80\n\t\tA 45 45, 0, 1, 0, 275 125\n    L 275 80 Z"/>')

            expectValidJS(code)
            assert.equal(code, 'createVNode(32, "path", null, null, 1, { "d": "M230 80 A 45 45, 0, 1, 0, 275 125 L 275 80 Z" });')
        })

        it('Should compile a multi-line prop on an element', () => {
            const code = transform('<div title="a\n   b" />')

            expectValidJS(code)
            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "a b" });')
        })

        it('Should compile a multi-line prop on a component (transform-react-inline-elements regressions/6276)', () => {
            const code = transform('<T default="\n    some string\n  " />')

            expectValidJS(code)
            assert.equal(code, 'createComponentVNode(2, T, { "default": " some string " });')
        })

        it('Should compile a line break that is not followed by whitespace', () => {
            const code = transform('<div title="a\nb" />')

            expectValidJS(code)
            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "title": "a\\nb" });')
        })

        it('Should compile a multi-line key', () => {
            expectValidJS(transform('<div key="line1\n  line2" />'))
        })

        it('Should compile an attribute with a CRLF line break', () => {
            const code = transform('<div a="x\r\n   y" />')

            expectValidJS(code)
            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "a": "x y" });')
        })
    })

    describe('attribute strings with backslashes', () => {
        it('Should compile a value ending in a backslash', () => {
            const code = transform(String.raw`<div title="\" />`)

            expectValidJS(code)
            assert.equal(code, String.raw`createVNode(1, "div", null, null, 1, { "title": "\\" });`)
        })

        it('Should keep regular expression escapes in pattern', () => {
            assert.equal(transform(String.raw`<input pattern="\d{3}" />`), String.raw`createVNode(64, "input", null, null, 1, { "pattern": "\\d{3}" });`)
        })

        it('Should keep a complex pattern (babel-parser regression/issue-2114)', () => {
            assert.equal(transform(String.raw`<input pattern="^([\w\.\-]+\s)*[\w\.\-]+\s?$" />`), String.raw`createVNode(64, "input", null, null, 1, { "pattern": "^([\\w\\.\\-]+\\s)*[\\w\\.\\-]+\\s?$" });`)
        })

        it('Should keep a backslash in a key (babel should-escape-xhtml-jsxattribute)', () => {
            assert.equal(transform(String.raw`<div key="\w" />`), String.raw`createVNode(1, "div", null, null, 1, null, "\\w");`)
        })

        it('Should keep backslashes before quotes (react compiler quoted-strings-in-jsx-attribute-escaped)', () => {
            assert.equal(transform(String.raw`<Stringify text='Some \"text\"' />`), String.raw`createComponentVNode(2, Stringify, { "text": "Some \\\"text\\\"" });`)
        })

        it('Should produce valid module code for \\9 (oxc jsx-attribute-legacy-escapes)', () => {
            const code = transform(String.raw`<Component mask="+4\9 99 999 99" />`)

            expectValidJS(code)
            assert.equal(code, String.raw`createComponentVNode(2, Component, { "mask": "+4\\9 99 999 99" });`)
        })

        it('Should keep \\0 as a backslash and a zero', () => {
            assert.equal(transform(String.raw`<div re="\0" />`), String.raw`createVNode(1, "div", null, null, 1, { "re": "\\0" });`)
        })

        it('Should keep \\n as a backslash and an n', () => {
            assert.equal(transform(String.raw`<div title="\n" />`), String.raw`createVNode(1, "div", null, null, 1, { "title": "\\n" });`)
        })
    })

    describe('attribute strings with entities', () => {
        it('Should decode entities in element props', () => {
            assert.equal(transform('<div title="a&amp;b" />'), 'createVNode(1, "div", null, null, 1, { "title": "a&b" });')
        })

        it('Should decode entities in component props', () => {
            assert.equal(transform('<Foo title="a&amp;b" />'), 'createComponentVNode(2, Foo, { "title": "a&b" });')
        })

        it('Should decode entities in className', () => {
            assert.equal(transform('<div className="a &amp; b" />'), 'createVNode(1, "div", "a & b");')
        })

        it('Should decode quote entities in class', () => {
            assert.equal(transform('<div class="&quot;q&quot;" />'), 'createVNode(1, "div", "\\"q\\"");')
        })

        it('Should decode entities in key', () => {
            assert.equal(transform('<div key="a&amp;b" />'), 'createVNode(1, "div", null, null, 1, null, "a&b");')
        })

        it('Should decode named entities (oxc attribute-escapes)', () => {
            assert.equal(transform('<Foo bar="&Egrave; &euro; &quot;" />'), 'createComponentVNode(2, Foo, { "bar": "\\u00C8 \\u20AC \\"" });')
        })

        it('Should decode numeric entities (oxc attribute-escapes)', () => {
            assert.equal(transform('<Foo bar="&#xC; &#x41;" />'), 'createComponentVNode(2, Foo, { "bar": "\\f A" });')
        })

        it('Should decode &amp; and keep unknown entities (babel-parser basic/4)', () => {
            assert.equal(transform('<a d="&amp;" e="&ampr;" />'), 'createVNode(1, "a", null, null, 1, { "d": "&", "e": "&ampr;" });')
        })

        // Line breaks in the source are collapsed before entities are decoded, like in text; babel collapses the decoded one too
        it('Should keep an encoded line break in an attribute string', () => {
            assert.equal(transform('<div title="a&#10;\n  b" />'), 'createVNode(1, "div", null, null, 1, { "title": "a\\n b" });')
        })
    })

    // The string "null" is a value like any other string, only the null keyword leaves an argument out
    describe('the string "null"', () => {
        it('Should keep null text', () => {
            assert.equal(transform('<div>null</div>'), 'createVNode(1, "div", null, "null", 16);')
        })

        it('Should keep a null string expression child', () => {
            assert.equal(transform('<div>{"null"}</div>'), 'createVNode(1, "div", null, "null", 0);')
        })

        it('Should keep a null children prop string', () => {
            assert.equal(transform('<div children="null" />'), 'createVNode(1, "div", null, "null", 16);')
        })

        it('Should keep a null class name', () => {
            assert.equal(transform('<div className="null" />'), 'createVNode(1, "div", "null");')
            assert.equal(transform('<div className={`null`} />'), 'createVNode(1, "div", `null`);')
        })

        it('Should keep a null key', () => {
            assert.equal(transform('<div key="null" />'), 'createVNode(1, "div", null, null, 1, null, "null");')
            assert.equal(transform('<Foo key="null" />'), 'createComponentVNode(2, Foo, null, "null");')
            assert.equal(transform('<Fragment key="null"><a/><b/></Fragment>'), 'createFragment([createVNode(1, "a"), createVNode(1, "b")], 4, "null");')
        })

        it('Should keep a null ref string', () => {
            assert.equal(transform('<div ref={"null"} />'), 'createVNode(1, "div", null, null, 1, null, null, "null");')
        })

        it('Should leave out the null keyword', () => {
            assert.equal(transform('<div className={null} key={null} ref={null} />'), 'createVNode(1, "div");')
        })
    })

    describe('children prop strings', () => {
        it('Should decode entities in an element children prop string', () => {
            const code = transform('<div children="a&amp;b" />')

            assert.equal(code, 'createVNode(1, "div", null, "a&b", 16);')
            expectValidJS(code)
        })

        it('Should keep a whitespace-only element children prop string', () => {
            assert.equal(transform('<div children="   " />'), 'createVNode(1, "div", null, "   ", 16);')
        })

        it('Should create no children for an empty element children prop string', () => {
            assert.equal(transform('<div children="" />'), 'createVNode(1, "div");')
        })
    })
})
