import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform, expectValidJS, run} from './helpers'

// TypeScript prints non-ASCII characters of synthesized string literals as \uXXXX escapes, run() checks the runtime value

describe('Entities and strings', () => {
    describe('entities in text', () => {
        it('Should decode &nbsp;', () => {
            const code = transform('<div>&nbsp;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "\\u00A0");')
            assert.equal(run('<div>&nbsp;</div>').children, '\xA0')
            expectValidJS(code)
        })

        it('Should decode &amp; &lt; &gt; &quot;', () => {
            const code = transform('<div>&amp;&lt;&gt;&quot;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "&<>\\"");')
            expectValidJS(code)
        })

        it('Should decode decimal numeric entities', () => {
            const code = transform('<div>&#123;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "{");')
            expectValidJS(code)
        })

        it('Should decode hexadecimal numeric entities', () => {
            const code = transform('<div>&#x20;a</div>')

            assert.equal(code, 'newVNode(3, "div", null, " a");')
            expectValidJS(code)
        })

        it('Should decode &#0000; to a NUL character', () => {
            const code = transform('<div>&#0000;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "\\0");')
            expectValidJS(code)
        })

        it('Should decode &#11; to a vertical tab', () => {
            assert.equal(transform('<div>&#11;</div>'), 'newVNode(3, "div", null, "\\v");')
        })

        it('Should keep a numeric entity outside of Unicode verbatim', () => {
            assert.equal(transform('<div>&#x110000;</div>'), 'newVNode(3, "div", null, "&#x110000;");')
        })

        it('Should keep unknown entities verbatim', () => {
            const code = transform('<div>&nosuch;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "&nosuch;");')
            expectValidJS(code)
        })

        it('Should keep entity-like text verbatim', () => {
            const code = transform('<div>&ampr;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "&ampr;");')
            expectValidJS(code)
        })

        it('Should not resolve Object.prototype names as entities', () => {
            const code = transform('<div>&valueOf;</div>')

            assert.equal(code, 'newVNode(3, "div", null, "&valueOf;");')
            expectValidJS(code)
        })

        it('Should keep entities without a terminating semicolon verbatim', () => {
            const code = transform('<div>&Egrave &#123 &#x123</div>')

            assert.equal(code, 'newVNode(3, "div", null, "&Egrave &#123 &#x123");')
            expectValidJS(code)
        })
    })

    describe('unicode text', () => {
        it('Should keep emoji and accented characters', () => {
            const code = transform('<div>😀 ünïcödé</div>')

            assert.equal(code, 'newVNode(3, "div", null, "\\uD83D\\uDE00 \\u00FCn\\u00EFc\\u00F6d\\u00E9");')
            assert.equal(run('<div>😀 ünïcödé</div>').children, '😀 ünïcödé')
            expectValidJS(code)
        })

        it('Should keep CJK text', () => {
            const code = transform('<div>日本語</div>')

            assert.equal(code, 'newVNode(3, "div", null, "\\u65E5\\u672C\\u8A9E");')
            assert.equal(run('<div>日本語</div>').children, '日本語')
            expectValidJS(code)
        })
    })

    describe('backslashes in text', () => {
        it('Should keep backslashes in text literal', () => {
            const code = transform('<div>C:\\temp\\new</div>')

            assert.equal(code, 'newVNode(3, "div", null, "C:\\\\temp\\\\new");')
            expectValidJS(code)
        })

        it('Should not parse \\u escapes in text', () => {
            const code = transform('<div>this should not parse as unicode: \\u00a0</div>')

            assert.equal(code, 'newVNode(3, "div", null, "this should not parse as unicode: \\\\u00a0");')
            expectValidJS(code)
        })
    })

    describe('string attribute values', () => {
        it('Should keep a plain attribute string', () => {
            const code = transform('<div title="plain" />')

            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "plain" });')
            expectValidJS(code)
        })

        it('Should keep an empty attribute string', () => {
            const code = transform('<div title="" />')

            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "" });')
            expectValidJS(code)
        })

        it('Should keep non-ASCII characters in attribute strings', () => {
            const code = transform('<div title="ünïcödé 😀" />')

            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "\\u00FCn\\u00EFc\\u00F6d\\u00E9 \\uD83D\\uDE00" });')
            assert.equal(run('<div title="ünïcödé 😀" />').props.title, 'ünïcödé 😀')
            expectValidJS(code)
        })

        it('Should print a single-quoted attribute string with double quotes', () => {
            const code = transform('<div title=\'it"s\' />')

            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "it\\"s" });')
            expectValidJS(code)
        })

        // Entities are only decoded in JSX strings, a JavaScript string in an expression container is kept as is
        it('Should keep entity text in an expression container string verbatim', () => {
            assert.equal(transform('<div title={"a&amp;b"} />'), 'newVNode(17, "div", null, null, { "title": "a&amp;b" });')
        })

        it('Should keep entity text in an expression container child verbatim', () => {
            assert.equal(transform('<div>{"a&amp;b"}</div>'), 'newVNode(1, "div", null, "a&amp;b");')
        })
    })

    describe('attribute strings with line breaks', () => {
        it('Should compile a multi-line className', () => {
            const code = transform('<div className="flex\n    items-center\n    gap-2">x</div>')

            expectValidJS(code)
            assert.equal(code, 'newVNode(3, "div", "flex items-center gap-2", "x");')
        })

        it('Should compile a multi-line svg path (babel-parser regression/7)', () => {
            const code = transform('<path d="M230 80\n\t\tA 45 45, 0, 1, 0, 275 125\n    L 275 80 Z"/>')

            expectValidJS(code)
            assert.equal(code, 'newVNode(80, "path", null, null, { "d": "M230 80 A 45 45, 0, 1, 0, 275 125 L 275 80 Z" });')
        })

        it('Should compile a multi-line prop on an element', () => {
            const code = transform('<div title="a\n   b" />')

            expectValidJS(code)
            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "a b" });')
        })

        it('Should compile a multi-line prop on a component (transform-react-inline-elements regressions/6276)', () => {
            const code = transform('<T default="\n    some string\n  " />')

            expectValidJS(code)
            assert.equal(code, 'newComponentVNode(0, T, { "default": " some string " });')
        })

        it('Should compile a line break that is not followed by whitespace', () => {
            const code = transform('<div title="a\nb" />')

            expectValidJS(code)
            assert.equal(code, 'newVNode(17, "div", null, null, { "title": "a\\nb" });')
        })

        it('Should compile a multi-line key', () => {
            expectValidJS(transform('<div key="line1\n  line2" />'))
        })

        it('Should compile an attribute with a CRLF line break', () => {
            const code = transform('<div a="x\r\n   y" />')

            expectValidJS(code)
            assert.equal(code, 'newVNode(17, "div", null, null, { "a": "x y" });')
        })
    })

    describe('attribute strings with backslashes', () => {
        it('Should compile a value ending in a backslash', () => {
            const code = transform(String.raw`<div title="\" />`)

            expectValidJS(code)
            assert.equal(code, String.raw`newVNode(17, "div", null, null, { "title": "\\" });`)
        })

        it('Should keep regular expression escapes in pattern', () => {
            assert.equal(transform(String.raw`<input pattern="\d{3}" />`), String.raw`newVNode(528, "input", null, null, { "pattern": "\\d{3}" });`)
        })

        it('Should keep a complex pattern (babel-parser regression/issue-2114)', () => {
            assert.equal(transform(String.raw`<input pattern="^([\w\.\-]+\s)*[\w\.\-]+\s?$" />`), String.raw`newVNode(528, "input", null, null, { "pattern": "^([\\w\\.\\-]+\\s)*[\\w\\.\\-]+\\s?$" });`)
        })

        it('Should keep a backslash in a key (babel should-escape-xhtml-jsxattribute)', () => {
            assert.equal(transform(String.raw`<div key="\w" />`), String.raw`newVNode(17, "div", null, null, null, "\\w");`)
        })

        it('Should keep backslashes before quotes (react compiler quoted-strings-in-jsx-attribute-escaped)', () => {
            assert.equal(transform(String.raw`<Stringify text='Some \"text\"' />`), String.raw`newComponentVNode(0, Stringify, { "text": "Some \\\"text\\\"" });`)
        })

        it('Should produce valid module code for \\9 (oxc jsx-attribute-legacy-escapes)', () => {
            const code = transform(String.raw`<Component mask="+4\9 99 999 99" />`)

            expectValidJS(code)
            assert.equal(code, String.raw`newComponentVNode(0, Component, { "mask": "+4\\9 99 999 99" });`)
        })

        it('Should keep \\0 as a backslash and a zero', () => {
            assert.equal(transform(String.raw`<div re="\0" />`), String.raw`newVNode(17, "div", null, null, { "re": "\\0" });`)
        })

        it('Should keep \\n as a backslash and an n', () => {
            assert.equal(transform(String.raw`<div title="\n" />`), String.raw`newVNode(17, "div", null, null, { "title": "\\n" });`)
        })
    })

    describe('attribute strings with entities', () => {
        it('Should decode entities in element props', () => {
            assert.equal(transform('<div title="a&amp;b" />'), 'newVNode(17, "div", null, null, { "title": "a&b" });')
        })

        it('Should decode entities in component props', () => {
            assert.equal(transform('<Foo title="a&amp;b" />'), 'newComponentVNode(0, Foo, { "title": "a&b" });')
        })

        it('Should decode entities in className', () => {
            assert.equal(transform('<div className="a &amp; b" />'), 'newVNode(17, "div", "a & b");')
        })

        it('Should decode quote entities in class', () => {
            assert.equal(transform('<div class="&quot;q&quot;" />'), 'newVNode(17, "div", "\\"q\\"");')
        })

        it('Should decode entities in key', () => {
            assert.equal(transform('<div key="a&amp;b" />'), 'newVNode(17, "div", null, null, null, "a&b");')
        })

        it('Should decode named entities (oxc attribute-escapes)', () => {
            assert.equal(transform('<Foo bar="&Egrave; &euro; &quot;" />'), 'newComponentVNode(0, Foo, { "bar": "\\u00C8 \\u20AC \\"" });')
        })

        it('Should decode numeric entities (oxc attribute-escapes)', () => {
            assert.equal(transform('<Foo bar="&#xC; &#x41;" />'), 'newComponentVNode(0, Foo, { "bar": "\\f A" });')
        })

        it('Should decode &amp; and keep unknown entities (babel-parser basic/4)', () => {
            assert.equal(transform('<a d="&amp;" e="&ampr;" />'), 'newVNode(17, "a", null, null, { "d": "&", "e": "&ampr;" });')
        })

        // Line breaks in the source are collapsed before entities are decoded, like in text; babel collapses the decoded one too
        it('Should keep an encoded line break in an attribute string', () => {
            assert.equal(transform('<div title="a&#10;\n  b" />'), 'newVNode(17, "div", null, null, { "title": "a\\n b" });')
        })
    })

    // The string "null" is a value like any other string, only the null keyword leaves an argument out
    describe('the string "null"', () => {
        it('Should keep null text', () => {
            assert.equal(transform('<div>null</div>'), 'newVNode(3, "div", null, "null");')
        })

        it('Should keep a null string expression child', () => {
            assert.equal(transform('<div>{"null"}</div>'), 'newVNode(1, "div", null, "null");')
        })

        it('Should keep a null children prop string', () => {
            assert.equal(transform('<div children="null" />'), 'newVNode(3, "div", null, "null");')
        })

        it('Should keep a null class name', () => {
            assert.equal(transform('<div className="null" />'), 'newVNode(17, "div", "null");')
            assert.equal(transform('<div className={`null`} />'), 'newVNode(17, "div", `null`);')
        })

        it('Should keep a null key', () => {
            assert.equal(transform('<div key="null" />'), 'newVNode(17, "div", null, null, null, "null");')
            assert.equal(transform('<Foo key="null" />'), 'newComponentVNode(0, Foo, null, "null");')
            assert.equal(transform('<Fragment key="null"><a/><b/></Fragment>'), 'newFragment(260, [newVNode(17, "a"), newVNode(17, "b")], "null");')
        })

        it('Should keep a null ref string', () => {
            assert.equal(transform('<div ref={"null"} />'), 'newVNode(17, "div", null, null, null, null, "null");')
        })

        it('Should leave out the null keyword', () => {
            assert.equal(transform('<div className={null} key={null} ref={null} />'), 'newVNode(17, "div");')
        })
    })

    describe('children prop strings', () => {
        it('Should decode entities in an element children prop string', () => {
            const code = transform('<div children="a&amp;b" />')

            assert.equal(code, 'newVNode(3, "div", null, "a&b");')
            expectValidJS(code)
        })

        it('Should keep a whitespace-only element children prop string', () => {
            assert.equal(transform('<div children="   " />'), 'newVNode(3, "div", null, "   ");')
        })

        it('Should create no children for an empty element children prop string', () => {
            assert.equal(transform('<div children="" />'), 'newVNode(17, "div");')
        })
    })
})
