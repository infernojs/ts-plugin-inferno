// Cases mirrored from babel-plugin-inferno's tests/react-parity.test.js, which mirrors React's JSX test suites.
// Titles name the React test they come from.
// - babel-plugin-react-jsx: react a876808f0a^:packages/babel-plugin-react-jsx/__tests__/TransformJSXToReactJSX-test.js
// - jstransform: react d2fe87892d^:vendor/fbtransform/transforms/__tests__/react-test.js
// - compiler fixtures: react compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/
// - runtime tests: react packages/react/src/__tests__/ and packages/react-dom/src/__tests__/
// Cases that fail because of known transformer bugs live in tests/known-bugs/react-parity.test.ts

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectValidJS, run, transform} from './helpers'

describe('React parity', () => {
    describe('TransformJSXToReactJSX-test', () => {
        it('Should keep a trailing space before an expression (should handle attributed elements)', () => {
            assert.equal(transform('<div>Hello {this.props.name}</div>'), 'createVNode(1, "div", null, [createTextVNode("Hello "), this.props.name], 0);')
        })

        it('Should compile an element inside a multi-line attribute expression', () => {
            assert.equal(transform('<HelloMessage name={\n  <span>\n    Sebastian\n  </span>\n} />'), 'createComponentVNode(2, HelloMessage, { "name": createVNode(1, "span", null, "Sebastian", 16) });')
        })

        it('Should not strip &nbsp; followed by a space', () => {
            assert.equal(transform('<div>&nbsp; </div>'), 'createVNode(1, "div", null, "\\u00A0 ", 16);')
        })

        it('Should keep &nbsp; between words', () => {
            assert.equal(transform('<div>w &nbsp; w</div>'), 'createVNode(1, "div", null, "w \\u00A0 w", 16);')
            assert.equal(run('<div>w &nbsp; w</div>').children, 'w \u00A0 w')
        })

        it('Should keep a bare ampersand', () => {
            assert.equal(transform('<div>w & w</div>'), 'createVNode(1, "div", null, "w & w", 16);')
        })

        it('Should decode &amp; and &lt; in text', () => {
            assert.equal(transform('<div>w &amp; w</div>;\n<div>w &lt; w</div>'), 'createVNode(1, "div", null, "w & w", 16);\ncreateVNode(1, "div", null, "w < w", 16);')
        })

        it('Should keep non-ASCII text', () => {
            assert.equal(transform('<div>wôw</div>'), 'createVNode(1, "div", null, "w\\u00F4w", 16);')
            assert.equal(run('<div>wôw</div>').children, 'wôw')
        })

        it('Should compile a keyed React.Fragment without children', () => {
            assert.equal(transform('<React.Fragment key="foo"></React.Fragment>'), 'createFragment(null, 1, "foo");')
        })

        it('Should compile a spread of a null variable', () => {
            assert.equal(transform('var foo = null;\n<div {...foo} />'), 'var foo = null;\nnormalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, foo)));')
        })

        it('Should compile a spread followed by a prop', () => {
            assert.equal(transform('<Component {...props} sound="moo" />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, props, { "sound": "moo" })));')
        })

        it('Should compile a mixed static element and array child', () => {
            assert.equal(transform('<div><span />{[<span key="0" />, <span key="1" />]}</div>'), 'createVNode(1, "div", null, [createVNode(1, "span"), [createVNode(1, "span", null, null, 1, null, "0"), createVNode(1, "span", null, null, 1, null, "1")]], 0);')
        })

        it('Should compile a single array child', () => {
            assert.equal(transform('<div>{[<span key="0" />, <span key="1" />]}</div>'), 'createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "0"), createVNode(1, "span", null, null, 1, null, "1")], 0);')
        })
    })

    describe('jstransform react-test', () => {
        it('Should keep parenthesized attribute values', () => {
            assert.equal(transform('<foo a={(b)} c={(d)}>Hello</foo>'), 'createVNode(1, "foo", null, "Hello", 16, { "a": (b), "c": (d) });')
        })

        it('Should allow constructor as a component prop', () => {
            assert.equal(transform('<Component constructor="foo" />'), 'createComponentVNode(2, Component, { "constructor": "foo" });')
        })

        it('Should keep comments inside a parenthesized child expression', () => {
            const code = transform('<div>\n  Foo {(e+f //A line comment\n  /* A multiline comment */)\n  } bar\n</div>')

            assert.equal(code, 'createVNode(1, "div", null, [createTextVNode("Foo "), (e + f //A line comment\n    /* A multiline comment */ ), createTextVNode(" bar")], 0);')
            expectValidJS(code)
        })

        it('Should keep leading spaces of the first text line', () => {
            assert.equal(transform('<div>  sdfsdfsdf\n  sdlkfjsdfljs\n   </div>'), 'createVNode(1, "div", null, "  sdfsdfsdf sdlkfjsdfljs", 16);')
        })

        it('Should convert trailing tabs to spaces', () => {
            assert.equal(transform('<div>a  \t \t </div>'), 'createVNode(1, "div", null, "a      ", 16);')
        })

        it('Should keep a leading space', () => {
            assert.equal(transform('<div> a</div>'), 'createVNode(1, "div", null, " a", 16);')
        })

        it('Should keep a trailing space', () => {
            assert.equal(transform('<div>a </div>'), 'createVNode(1, "div", null, "a ", 16);')
        })
    })

    describe('compiler fixtures', () => {
        it('Should keep JSX text and a string literal child apart (preserve-jsxtext-stringliteral-distinction)', () => {
            assert.equal(transform('<div> {", "}</div>'), 'createVNode(1, "div", null, [createTextVNode(" "), createTextVNode(", ")], 0);')
        })

        it('Should compile nested member expression tags (jsx-member-expression)', () => {
            assert.equal(transform('<Sathya.Codes.Forget><Foo.Bar.Baz /></Sathya.Codes.Forget>'), 'createComponentVNode(2, Sathya.Codes.Forget, { "children": createComponentVNode(2, Foo.Bar.Baz) });')
        })

        it('Should compile a lowercase local member expression as a component (jsx-lowercase-localvar-memberexpr)', () => {
            assert.equal(transform('<localVar.Stringify>hello world {name}</localVar.Stringify>'), 'createComponentVNode(2, localVar.Stringify, { "children": ["hello world ", name] });')
        })

        it('Should keep a lowercase tag a string even with a same-named binding (invalid-jsx-lowercase-localvar)', () => {
            assert.equal(transform('const invalidTag = Throw;\n<invalidTag val={{val: 2}} />;'), 'const invalidTag = Throw;\ncreateVNode(1, "invalidTag", null, null, 1, { "val": { val: 2 } });')
        })

        it('Should compile a valueless attribute to true (jsx-attribute-default-to-true)', () => {
            assert.equal(transform('<Stringify truthyAttribute />'), 'createComponentVNode(2, Stringify, { "truthyAttribute": true });')
        })

        it('Should decode entities in text (jsx-html-entity)', () => {
            assert.equal(transform('<div>&gt;&lt;span &amp;</div>'), 'createVNode(1, "div", null, "><span &", 16);')
        })

        it('Should decode numeric entities across a line break (jsx-bracket-in-text)', () => {
            assert.equal(transform('<div>If the string contains the string &#123;pageNumber&#125; it will be\n    replaced</div>'), 'createVNode(1, "div", null, "If the string contains the string {pageNumber} it will be replaced", 16);')
        })

        it('Should keep double quotes inside a single-quoted attribute (quoted-strings-in-jsx-attribute)', () => {
            assert.equal(transform('<Stringify text=\'Some "text"\' />'), 'createComponentVNode(2, Stringify, { "text": "Some \\"text\\"" });')
        })

        it('Should keep escapes of strings in expression containers (jsx-string-attribute-expression-container)', () => {
            assert.equal(transform('<Foo value={\'\\n\'} other={\'A\\tE\'} />'), 'createComponentVNode(2, Foo, { "value": \'\\n\', "other": \'A\\tE\' });')
        })

        it('Should keep lone surrogates in expression containers (lone-surrogate-string-values)', () => {
            assert.equal(transform('<Foo codepoints={[\'\\uD83E\', \'\\uDD21\']} />'), 'createComponentVNode(2, Foo, { "codepoints": [\'\\uD83E\', \'\\uDD21\'] });')
        })

        it('Should keep key and style after a spread (repro-undefined-expression-of-jsxexpressioncontainer)', () => {
            assert.equal(transform('<Stringify {...buttonProps} key={`button-${i}`} style={s} />'), 'normalizeProps(createComponentVNode(2, Stringify, Object.assign({}, buttonProps, { "style": s }), `button-${i}`));')
        })
    })

    describe('react-dom and runtime tests', () => {
        it('Should keep explicit space children (ReactDOMServerIntegrationElements)', () => {
            assert.equal(transform('<div>{" "}{" "}{" "}</div>'), 'createVNode(1, "div", null, [" ", " ", " "], 0);')
        })

        it('Should keep a space between two expressions in an option (ReactDOMOption)', () => {
            assert.equal(transform('<option>\n  {1} {"foo"}\n</option>'), 'createVNode(1, "option", null, [1, createTextVNode(" "), createTextVNode("foo")], 0);')
        })

        it('Should split text around an expression in an option (ReactDOMOption)', () => {
            assert.equal(transform('<option>gir{a}ffe</option>'), 'createVNode(1, "option", null, [createTextVNode("gir"), a, createTextVNode("ffe")], 0);')
        })

        it('Should keep text directly next to an element (ReactDOMServerIntegrationElements)', () => {
            assert.equal(transform('<div>\n  Text<span>More Text</span>\n</div>'), 'createVNode(1, "div", null, [createTextVNode("Text"), createVNode(1, "span", null, "More Text", 16)], 4);')
        })

        it('Should compile deeply nested fragments with null and false (ReactDOMServerIntegrationFragment)', () => {
            assert.equal(transform('<><><div>text1</div></><span/><><><>{null}<p /></>{false}</></></>'), 'createFragment([createFragment([createVNode(1, "div", null, "text1", 16)], 4), createVNode(1, "span"), createFragment([createFragment([createFragment([null, createVNode(1, "p")], 0), false], 0)], 4)], 4);')
        })

        it('Should pass expression children of a textarea (ReactDOMTextarea)', () => {
            assert.equal(transform('<textarea>{17}</textarea>'), 'createVNode(128, "textarea", null, 17, 0);')
        })

        it('Should keep select props (ReactDOMSelect)', () => {
            assert.equal(transform('<select multiple={true} defaultValue={["giraffe"]} />'), 'createVNode(256, "select", null, null, 1, { "multiple": true, "defaultValue": ["giraffe"] });')
        })

        it('Should pass __source and __self as ordinary props (ReactElementValidator)', () => {
            assert.equal(transform('<div __source={{fileName: "a"}} __self={this} />'), 'createVNode(1, "div", null, null, 1, { "__source": { fileName: "a" }, "__self": this });')
        })

        it('Should keep a whitespace-only line between inline elements (whitespace transformer README)', () => {
            assert.equal(transform('<div>\n  Monkeys:\n  <input type="text" /> <button />\n</div>'), 'createVNode(1, "div", null, [createTextVNode("Monkeys:"), createVNode(64, "input", null, null, 1, { "type": "text" }), createTextVNode(" "), createVNode(1, "button")], 4);')
        })

        it('Should keep a whitespace-only text between inline elements as a text vNode (whitespace transformer README)', () => {
            assert.equal(transform('<div><b/> <i/></div>'), 'createVNode(1, "div", null, [createVNode(1, "b"), createTextVNode(" "), createVNode(1, "i")], 4);')
        })
    })

    describe('current behaviour (questionable)', () => {
        // React drops the comments entirely: the span gets no children and the div two static children
        it('Should keep empty spans and UnknownChildren when comments sit between children (TransformJSXToReactJSX-test)', () => {
            assert.equal(transform('<div>\n  {/* A comment at the beginning */}\n  {/* A second comment at the beginning */}\n  <span>\n    {/* A nested comment */}\n  </span>\n  {/* A sandwiched comment */}\n  <br />\n  {/* A comment at the end */}\n  {/* A second comment at the end */}\n</div>'), 'createVNode(1, "div", null, [createVNode(1, "span", null, null, 0), createVNode(1, "br")], 0);')
        })
    })

    describe('TSX variants', () => {
        it('Should compile a single array child with a type assertion', () => {
            assert.equal(transform('<div>{[<span key="0" />, <span key="1" />] as VNode[]}</div>'), 'createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "0"), createVNode(1, "span", null, null, 1, null, "1")], 0);')
        })

        it('Should compile a spread with a type assertion followed by a prop', () => {
            assert.equal(transform('<Component {...(props as Props)} sound="moo" />'), 'normalizeProps(createComponentVNode(2, Component, Object.assign({}, props, { "sound": "moo" })));')
        })

        it('Should compile a spread of a typed null variable', () => {
            assert.equal(transform('var foo: Props | null = null;\n<div {...foo} />'), 'var foo = null;\nnormalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, foo)));')
        })

        it('Should keep key and style after a spread on a generic component', () => {
            assert.equal(transform('<Stringify<Props> {...buttonProps} key={`button-${i}`} style={s as CSSProperties} />'), 'normalizeProps(createComponentVNode(2, Stringify, Object.assign({}, buttonProps, { "style": s }), `button-${i}`));')
        })
    })
})
