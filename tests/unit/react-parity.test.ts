// Cases mirrored from babel-plugin-inferno's tests/react-parity.test.js, which mirrors React's JSX test suites.
// Titles name the React test they come from.
// - babel-plugin-react-jsx: react a876808f0a^:packages/babel-plugin-react-jsx/__tests__/TransformJSXToReactJSX-test.js
// - jstransform: react d2fe87892d^:vendor/fbtransform/transforms/__tests__/react-test.js
// - compiler fixtures: react compiler/packages/babel-plugin-react-compiler/src/__tests__/fixtures/compiler/
// - runtime tests: react packages/react/src/__tests__/ and packages/react-dom/src/__tests__/

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectValidJS, run, transform} from './helpers'

describe('React parity', () => {
    describe('TransformJSXToReactJSX-test', () => {
        it('Should keep a trailing space before an expression (should handle attributed elements)', () => {
            assert.equal(transform('<div>Hello {this.props.name}</div>'), 'newVNode(1, "div", null, [newTextVNode("Hello "), this.props.name]);')
        })

        it('Should compile an element inside a multi-line attribute expression', () => {
            assert.equal(transform('<HelloMessage name={\n  <span>\n    Sebastian\n  </span>\n} />'), 'newComponentVNode(0, HelloMessage, { "name": newVNode(3, "span", null, "Sebastian") });')
        })

        it('Should not strip &nbsp; followed by a space', () => {
            assert.equal(transform('<div>&nbsp; </div>'), 'newVNode(3, "div", null, "\\u00A0 ");')
        })

        it('Should keep &nbsp; between words', () => {
            assert.equal(transform('<div>w &nbsp; w</div>'), 'newVNode(3, "div", null, "w \\u00A0 w");')
            assert.equal(run('<div>w &nbsp; w</div>').children, 'w \u00A0 w')
        })

        it('Should keep a bare ampersand', () => {
            assert.equal(transform('<div>w & w</div>'), 'newVNode(3, "div", null, "w & w");')
        })

        it('Should decode &amp; and &lt; in text', () => {
            assert.equal(transform('<div>w &amp; w</div>;\n<div>w &lt; w</div>'), 'newVNode(3, "div", null, "w & w");\nnewVNode(3, "div", null, "w < w");')
        })

        it('Should keep non-ASCII text', () => {
            assert.equal(transform('<div>wôw</div>'), 'newVNode(3, "div", null, "w\\u00F4w");')
            assert.equal(run('<div>wôw</div>').children, 'wôw')
        })

        it('Should compile a keyed React.Fragment without children', () => {
            assert.equal(transform('<React.Fragment key="foo"></React.Fragment>'), 'newFragment(272, null, "foo");')
        })

        it('Should compile a spread of a null variable', () => {
            assert.equal(transform('var foo = null;\n<div {...foo} />'), 'var foo = null;\nnormalizeProps(newVNode(17, "div", null, null, Object.assign({}, foo)));')
        })

        it('Should compile a spread followed by a prop', () => {
            assert.equal(transform('<Component {...props} sound="moo" />'), 'normalizeProps(newComponentVNode(0, Component, Object.assign({}, props, { "sound": "moo" })));')
        })

        it('Should drop a children prop that is overridden by a spread and JSX children', () => {
            const vNode = run('<Component children={1} {...x}>2</Component>', {Component: 'Component', x: {children: 'spread'}})

            assert.equal(vNode.props.children, '2')
        })

        it('Should compile a mixed static element and array child', () => {
            assert.equal(transform('<div><span />{[<span key="0" />, <span key="1" />]}</div>'), 'newVNode(1, "div", null, [newVNode(17, "span"), [newVNode(17, "span", null, null, null, "0"), newVNode(17, "span", null, null, null, "1")]]);')
        })

        it('Should compile a single array child', () => {
            assert.equal(transform('<div>{[<span key="0" />, <span key="1" />]}</div>'), 'newVNode(1, "div", null, [newVNode(17, "span", null, null, null, "0"), newVNode(17, "span", null, null, null, "1")]);')
        })
    })

    describe('jstransform react-test', () => {
        it('Should keep parenthesized attribute values', () => {
            assert.equal(transform('<foo a={(b)} c={(d)}>Hello</foo>'), 'newVNode(3, "foo", null, "Hello", { "a": (b), "c": (d) });')
        })

        it('Should allow constructor as a component prop', () => {
            assert.equal(transform('<Component constructor="foo" />'), 'newComponentVNode(0, Component, { "constructor": "foo" });')
        })

        it('Should keep comments inside a parenthesized child expression', () => {
            const code = transform('<div>\n  Foo {(e+f //A line comment\n  /* A multiline comment */)\n  } bar\n</div>')

            assert.equal(code, 'newVNode(1, "div", null, [newTextVNode("Foo "), (e + f //A line comment\n    /* A multiline comment */ ), newTextVNode(" bar")]);')
            expectValidJS(code)
        })

        it('Should keep leading spaces of the first text line', () => {
            assert.equal(transform('<div>  sdfsdfsdf\n  sdlkfjsdfljs\n   </div>'), 'newVNode(3, "div", null, "  sdfsdfsdf sdlkfjsdfljs");')
        })

        it('Should convert trailing tabs to spaces', () => {
            assert.equal(transform('<div>a  \t \t </div>'), 'newVNode(3, "div", null, "a      ");')
        })

        it('Should keep a leading space', () => {
            assert.equal(transform('<div> a</div>'), 'newVNode(3, "div", null, " a");')
        })

        it('Should keep a trailing space', () => {
            assert.equal(transform('<div>a </div>'), 'newVNode(3, "div", null, "a ");')
        })
    })

    describe('compiler fixtures', () => {
        it('Should keep JSX text and a string literal child apart (preserve-jsxtext-stringliteral-distinction)', () => {
            assert.equal(transform('<div> {", "}</div>'), 'newVNode(1, "div", null, [newTextVNode(" "), newTextVNode(", ")]);')
        })

        it('Should compile nested member expression tags (jsx-member-expression)', () => {
            assert.equal(transform('<Sathya.Codes.Forget><Foo.Bar.Baz /></Sathya.Codes.Forget>'), 'newComponentVNode(0, Sathya.Codes.Forget, { "children": newComponentVNode(0, Foo.Bar.Baz) });')
        })

        it('Should compile a lowercase local member expression as a component (jsx-lowercase-localvar-memberexpr)', () => {
            assert.equal(transform('<localVar.Stringify>hello world {name}</localVar.Stringify>'), 'newComponentVNode(0, localVar.Stringify, { "children": ["hello world ", name] });')
        })

        it('Should keep a lowercase tag a string even with a same-named binding (invalid-jsx-lowercase-localvar)', () => {
            assert.equal(transform('const invalidTag = Throw;\n<invalidTag val={{val: 2}} />;'), 'const invalidTag = Throw;\nnewVNode(17, "invalidTag", null, null, { "val": { val: 2 } });')
        })

        it('Should compile a valueless attribute to true (jsx-attribute-default-to-true)', () => {
            assert.equal(transform('<Stringify truthyAttribute />'), 'newComponentVNode(0, Stringify, { "truthyAttribute": true });')
        })

        it('Should decode entities in text (jsx-html-entity)', () => {
            assert.equal(transform('<div>&gt;&lt;span &amp;</div>'), 'newVNode(3, "div", null, "><span &");')
        })

        it('Should decode numeric entities across a line break (jsx-bracket-in-text)', () => {
            assert.equal(transform('<div>If the string contains the string &#123;pageNumber&#125; it will be\n    replaced</div>'), 'newVNode(3, "div", null, "If the string contains the string {pageNumber} it will be replaced");')
        })

        it('Should keep double quotes inside a single-quoted attribute (quoted-strings-in-jsx-attribute)', () => {
            assert.equal(transform('<Stringify text=\'Some "text"\' />'), 'newComponentVNode(0, Stringify, { "text": "Some \\"text\\"" });')
        })

        it('Should keep escapes of strings in expression containers (jsx-string-attribute-expression-container)', () => {
            assert.equal(transform('<Foo value={\'\\n\'} other={\'A\\tE\'} />'), 'newComponentVNode(0, Foo, { "value": \'\\n\', "other": \'A\\tE\' });')
        })

        it('Should keep lone surrogates in expression containers (lone-surrogate-string-values)', () => {
            assert.equal(transform('<Foo codepoints={[\'\\uD83E\', \'\\uDD21\']} />'), 'newComponentVNode(0, Foo, { "codepoints": [\'\\uD83E\', \'\\uDD21\'] });')
        })

        it('Should keep key and style after a spread (repro-undefined-expression-of-jsxexpressioncontainer)', () => {
            assert.equal(transform('<Stringify {...buttonProps} key={`button-${i}`} style={s} />'), 'normalizeProps(newComponentVNode(0, Stringify, Object.assign({}, buttonProps, { "style": s }), `button-${i}`));')
        })
    })

    describe('react-dom and runtime tests', () => {
        it('Should keep explicit space children (ReactDOMServerIntegrationElements)', () => {
            assert.equal(transform('<div>{" "}{" "}{" "}</div>'), 'newVNode(1, "div", null, [" ", " ", " "]);')
        })

        it('Should keep a space between two expressions in an option (ReactDOMOption)', () => {
            assert.equal(transform('<option>\n  {1} {"foo"}\n</option>'), 'newVNode(1, "option", null, [1, newTextVNode(" "), newTextVNode("foo")]);')
        })

        it('Should split text around an expression in an option (ReactDOMOption)', () => {
            assert.equal(transform('<option>gir{a}ffe</option>'), 'newVNode(1, "option", null, [newTextVNode("gir"), a, newTextVNode("ffe")]);')
        })

        it('Should keep text directly next to an element (ReactDOMServerIntegrationElements)', () => {
            assert.equal(transform('<div>\n  Text<span>More Text</span>\n</div>'), 'newVNode(5, "div", null, [newTextVNode("Text"), newVNode(3, "span", null, "More Text")]);')
        })

        it('Should compile deeply nested fragments with null and false (ReactDOMServerIntegrationFragment)', () => {
            assert.equal(transform('<><><div>text1</div></><span/><><><>{null}<p /></>{false}</></></>'), 'newFragment(260, [newFragment(260, [newVNode(3, "div", null, "text1")]), newVNode(17, "span"), newFragment(260, [newFragment(256, [newFragment(256, [null, newVNode(17, "p")]), false])])]);')
        })

        it('Should pass expression children of a textarea (ReactDOMTextarea)', () => {
            assert.equal(transform('<textarea>{17}</textarea>'), 'newVNode(2048, "textarea", null, 17);')
        })

        it('Should keep select props (ReactDOMSelect)', () => {
            assert.equal(transform('<select multiple={true} defaultValue={["giraffe"]} />'), 'newVNode(4112, "select", null, null, { "multiple": true, "defaultValue": ["giraffe"] });')
        })

        it('Should pass __source and __self as ordinary props (ReactElementValidator)', () => {
            assert.equal(transform('<div __source={{fileName: "a"}} __self={this} />'), 'newVNode(17, "div", null, null, { "__source": { fileName: "a" }, "__self": this });')
        })

        it('Should keep a whitespace-only line between inline elements (whitespace transformer README)', () => {
            assert.equal(transform('<div>\n  Monkeys:\n  <input type="text" /> <button />\n</div>'), 'newVNode(5, "div", null, [newTextVNode("Monkeys:"), newVNode(528, "input", null, null, { "type": "text" }), newTextVNode(" "), newVNode(17, "button")]);')
        })

        it('Should keep a whitespace-only text between inline elements as a text vNode (whitespace transformer README)', () => {
            assert.equal(transform('<div><b/> <i/></div>'), 'newVNode(5, "div", null, [newVNode(17, "b"), newTextVNode(" "), newVNode(17, "i")]);')
        })
    })

    describe('current behaviour (questionable)', () => {
        // React drops the comments entirely: the span gets no children and the div two static children
        it('Should keep empty spans and UnknownChildren when comments sit between children (TransformJSXToReactJSX-test)', () => {
            assert.equal(transform('<div>\n  {/* A comment at the beginning */}\n  {/* A second comment at the beginning */}\n  <span>\n    {/* A nested comment */}\n  </span>\n  {/* A sandwiched comment */}\n  <br />\n  {/* A comment at the end */}\n  {/* A second comment at the end */}\n</div>'), 'newVNode(1, "div", null, [newVNode(1, "span"), newVNode(17, "br")]);')
        })
    })

    describe('TSX variants', () => {
        it('Should compile a single array child with a type assertion', () => {
            assert.equal(transform('<div>{[<span key="0" />, <span key="1" />] as VNode[]}</div>'), 'newVNode(1, "div", null, [newVNode(17, "span", null, null, null, "0"), newVNode(17, "span", null, null, null, "1")]);')
        })

        it('Should compile a spread with a type assertion followed by a prop', () => {
            assert.equal(transform('<Component {...(props as Props)} sound="moo" />'), 'normalizeProps(newComponentVNode(0, Component, Object.assign({}, props, { "sound": "moo" })));')
        })

        it('Should compile a spread of a typed null variable', () => {
            assert.equal(transform('var foo: Props | null = null;\n<div {...foo} />'), 'var foo = null;\nnormalizeProps(newVNode(17, "div", null, null, Object.assign({}, foo)));')
        })

        it('Should keep key and style after a spread on a generic component', () => {
            assert.equal(transform('<Stringify<Props> {...buttonProps} key={`button-${i}`} style={s as CSSProperties} />'), 'normalizeProps(newComponentVNode(0, Stringify, Object.assign({}, buttonProps, { "style": s }), `button-${i}`));')
        })
    })
})
