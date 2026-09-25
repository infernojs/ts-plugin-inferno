import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform, run} from './helpers'
import handleWhiteSpace from '../../src/utils/handleWhiteSpace'

describe('Whitespace and text', () => {
    describe('multi-line text', () => {
        it('Should join multi-line text with a single space', () => {
            assert.equal(transform('<div>\n  hello\n  world\n</div>'), 'createVNode(1, "div", null, "hello world", 16);')
        })

        it('Should drop blank lines inside multi-line text', () => {
            assert.equal(transform('<div>\n  a\n\n  b\n</div>'), 'createVNode(1, "div", null, "a b", 16);')
        })

        it('Should drop whitespace-only first and last lines', () => {
            assert.equal(transform('<div>  \n  a  \n  </div>'), 'createVNode(1, "div", null, "a", 16);')
        })

        it('Should drop a trailing whitespace-only line after text', () => {
            assert.equal(transform('<div>a  \n  </div>'), 'createVNode(1, "div", null, "a", 16);')
        })

        it('Should keep trailing spaces of the last line', () => {
            assert.equal(transform('<div>\n  a\n  b  </div>'), 'createVNode(1, "div", null, "a b  ", 16);')
        })

        it('Should convert tabs to spaces and trim tab indentation', () => {
            assert.equal(transform('<div>\n\t\ta\n\t\tb\n</div>'), 'createVNode(1, "div", null, "a b", 16);')
        })

        it('Should treat \\r\\n as a line break', () => {
            assert.equal(transform('<div>a\r\nb</div>'), 'createVNode(1, "div", null, "a b", 16);')
        })

        it('Should treat a lone \\r as a line break', () => {
            assert.equal(transform('<div>a\rb</div>'), 'createVNode(1, "div", null, "a b", 16);')
        })

        it('Should remove whitespace-only multi-line children of an element', () => {
            assert.equal(transform('<div>\n\n</div>'), 'createVNode(1, "div");')
        })
    })

    describe('single-line text', () => {
        it('Should keep leading and trailing spaces of single-line text', () => {
            assert.equal(transform('<div>  hello  </div>'), 'createVNode(1, "div", null, "  hello  ", 16);')
        })

        it('Should convert tabs inside single-line text to spaces', () => {
            assert.equal(transform('<div>\ta\tb\t</div>'), 'createVNode(1, "div", null, " a b ", 16);')
        })

        /*
         * babel wraps whitespace-only text between expressions in createTextVNode, this plugin passes it as a string.
         * childFlags 0 (UnknownChildren) makes Inferno normalize the string into a text vNode, so both render the same.
         */
        it('Should keep a single space between two expressions', () => {
            assert.equal(transform('<div>{a} {b}</div>'), 'createVNode(1, "div", null, [a, createTextVNode(" "), b], 0);')
        })

        it('Should keep a single space between two expressions with type assertions', () => {
            assert.equal(transform('<div>{a as string} {b!}</div>'), 'createVNode(1, "div", null, [a, createTextVNode(" "), b], 0);')
        })

        it('Should keep spaces around a single expression on one line', () => {
            assert.equal(transform('<div>  {a}  </div>'), 'createVNode(1, "div", null, [createTextVNode("  "), a, createTextVNode("  ")], 0);')
        })

        it('Should drop a line break between two expressions', () => {
            assert.equal(transform('<div>{a}\n{b}</div>'), 'createVNode(1, "div", null, [a, b], 0);')
        })

        it('Should drop indentation between expressions', () => {
            assert.equal(transform('<div>\n  {a}\n  {b}\n</div>'), 'createVNode(1, "div", null, [a, b], 0);')
        })
    })

    describe('text next to expressions', () => {
        it('Should keep the space between text and an expression on the same line', () => {
            assert.equal(transform('<div>\n  foo {bar}\n</div>'), 'createVNode(1, "div", null, [createTextVNode("foo "), bar], 0);')
        })

        it('Should split text lines separated by an expression line', () => {
            assert.equal(transform('<div>\n  foo\n  {bar}\n  baz\n</div>'), 'createVNode(1, "div", null, [createTextVNode("foo"), bar, createTextVNode("baz")], 0);')
        })

        it('Should keep an explicit {" "} child', () => {
            assert.equal(transform('<div>{a}{" "}{b}</div>'), 'createVNode(1, "div", null, [a, " ", b], 0);')
        })
    })

    describe('whitespace-only children', () => {
        it('Should pass single-line whitespace as component children', () => {
            assert.equal(transform('<Foo>  </Foo>'), 'createComponentVNode(2, Foo, { "children": "  " });')
        })

        it('Should pass single-line whitespace as children of a component with type arguments', () => {
            assert.equal(transform('<Foo<Props>>  </Foo>'), 'createComponentVNode(2, Foo, { "children": "  " });')
        })

        it('Should drop indentation around a single component child', () => {
            assert.equal(transform('<Foo>\n  <div/>\n</Foo>'), 'createComponentVNode(2, Foo, { "children": createVNode(1, "div") });')
        })

        it('Should create no children for a component with only a line break', () => {
            assert.equal(transform('<Baz>\n</Baz>'), 'createComponentVNode(2, Baz);')
        })

        it('Should create an empty fragment when it only contains whitespace lines', () => {
            assert.equal(transform('<>\n  \n</>'), 'createFragment();')
        })

        it('Should keep single-line whitespace inside a long syntax Fragment', () => {
            assert.equal(transform('<Fragment>  </Fragment>'), 'createFragment([createTextVNode("  ")], 4);')
        })

        it('Should keep single-line whitespace inside a short syntax fragment', () => {
            assert.equal(transform('<>  </>'), 'createFragment([createTextVNode("  ")], 4);')
        })
    })

    // TypeScript prints a non-breaking space as  , run() checks the runtime value
    describe('non-breaking spaces', () => {
        it('Should not trim &nbsp; on its own line', () => {
            assert.equal(transform('<div>\n  &nbsp;\n</div>'), 'createVNode(1, "div", null, "\\u00A0", 16);')
            assert.equal(run('<div>\n  &nbsp;\n</div>').children, '\xA0')
        })

        it('Should keep literal non-breaking spaces', () => {
            assert.equal(transform('<div>   </div>'), 'createVNode(1, "div", null, "\\u00A0 \\u00A0", 16);')
        })

        it('Should only trim spaces and tabs, not literal non-breaking spaces', () => {
            assert.equal(transform('<div>\n   a \n</div>'), 'createVNode(1, "div", null, "\\u00A0a\\u00A0", 16);')
        })
    })

    // The table tests of swc-plugin-inferno src/jsx/tests.rs (jsx_text and jsx_text_edge_cases), for src/utils/handleWhiteSpace.ts
    describe('handleWhiteSpace', () => {
        const cases: [string, string, string][] = [
            ['a single space', ' ', ' '],
            ['words', 'Hello world', 'Hello world'],
            ['whitespace at the edges of a single line', '  Hello world  ', '  Hello world  '],
            ['an empty string', '', ''],
            ['a single line of spaces', '   ', '   '],
            ['a single line of tabs, which become spaces', '\t\t', '  '],
            ['two lines', 'Hello\nworld', 'Hello world'],
            ['two lines with whitespace at the edges', '  Hello  \n  world  ', '  Hello world  '],
            ['an empty line', 'Hello\n\nworld', 'Hello world'],
            ['a blank line', 'Hello\n  \n  world', 'Hello world'],
            ['three lines with whitespace at the edges', '  Hello  \n  world  \n  test  ', '  Hello world test  '],
            ['blank lines only', ' \n ', ''],
            ['line breaks only', '\n\n\n', ''],
            ['indentation only', '  \n  \n  ', ''],
            ['a \\r line break', 'Hello\rworld', 'Hello world'],
            ['a \\r\\n line break', 'Hello\r\nworld', 'Hello world'],
            ['mixed spaces and tabs', '\t Hello \t\n\t world \t', '  Hello world  '],
            ['\\r\\n and \\r line breaks with indentation', 'a\r\n  b\rc', 'a b c'],
            ['a tab-only line', 'a\n\t\t\nb', 'a b'],
            ['a tab inside non-ASCII text', 'ä\tö', 'ä ö'],
            ['tabs around a line break in non-ASCII text', 'ä\t\n\tö\t', 'ä ö '],
            ['the outer whitespace of the first and last lines', '  a  \n  b  ', '  a b  '],
            ['a blank last line', '  a  \n  ', '  a']
        ]

        for (const [description, input, expected] of cases) {
            it(`Should handle ${description}`, () => {
                assert.equal(handleWhiteSpace(input), expected)
            })
        }
    })
})
