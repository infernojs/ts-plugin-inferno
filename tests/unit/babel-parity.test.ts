// Cases mirrored from babel-plugin-inferno's tests/babel-parity.test.js, which mirrors Babel's fixtures.
// Titles name the fixture they come from.
// - babel/packages/babel-plugin-transform-react-jsx/test/fixtures/react/
// - babel/packages/babel-parser/test/fixtures/jsx/
// - babel/packages/babel-plugin-transform-react-constant-elements/test/fixtures/constant-elements/

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows, expectValidJS, run, transform, tscReact, tscText} from './helpers'

describe('Babel parity', () => {
    describe('transform-react-jsx fixtures', () => {
        it('should-convert-simple-tags', () => {
            assert.equal(transform('var x = <div></div>;'), 'var x = newVNode(17, "div");')
        })

        it('should-convert-simple-text', () => {
            assert.equal(transform('var x = <div>text</div>;'), 'var x = newVNode(3, "div", null, "text");')
        })

        it('should-allow-js-namespacing', () => {
            assert.equal(transform('<Namespace.Component />;'), 'newComponentVNode(0, Namespace.Component);')
        })

        it('should-allow-deeper-js-namespacing', () => {
            assert.equal(transform('<Namespace.DeepNamespace.Component />;'), 'newComponentVNode(0, Namespace.DeepNamespace.Component);')
        })

        it('should-transform-known-hyphenated-tags', () => {
            assert.equal(transform('<font-face />;'), 'newVNode(80, "font-face");')
        })

        it('this-tag-name', () => {
            assert.equal(transform('var div = <this.foo>test</this.foo>;'), 'var div = newComponentVNode(0, this.foo, { "children": "test" });')
        })

        it('assignment', () => {
            assert.equal(transform('var div = <Component {...props} foo="bar" />'), 'var div = normalizeProps(newComponentVNode(0, Component, Object.assign({}, props, { "foo": "bar" })));')
        })

        it('should-allow-elements-as-attributes', () => {
            assert.equal(transform('<div attr=<div /> />'), 'newVNode(17, "div", null, null, { "attr": newVNode(17, "div") });')
        })

        it('should-handle-attributed-elements', () => {
            assert.equal(transform('var HelloMessage = React.createClass({\n  render: function() {\n    return <div>Hello {this.props.name}</div>;\n  }\n});\n\nReact.render(<HelloMessage name={\n  <span>\n    Sebastian\n  </span>\n} />, mountNode);'), 'var HelloMessage = React.createClass({\n    render: function () {\n        return newVNode(1, "div", null, [newTextVNode("Hello "), this.props.name]);\n    }\n});\nReact.render(newComponentVNode(0, HelloMessage, { "name": newVNode(3, "span", null, "Sebastian") }), mountNode);')
        })

        it('should-not-add-quotes-to-identifier-names', () => {
            assert.equal(transform('var e = <F aaa new const var default foo-bar/>;'), 'var e = newComponentVNode(0, F, { "aaa": true, "new": true, "const": true, "var": true, "default": true, "foo-bar": true });')
        })

        it('should-quote-jsx-attributes', () => {
            assert.equal(transform('<button data-value=\'a value\'>Button</button>;'), 'newVNode(3, "button", null, "Button", { "data-value": "a value" });')
        })

        it('should-not-mangle-expressioncontainer-attribute-values', () => {
            assert.equal(transform('<button data-value={"a value\\n  with\\nnewlines\\n   and spaces"}>Button</button>;'), 'newVNode(3, "button", null, "Button", { "data-value": "a value\\n  with\\nnewlines\\n   and spaces" });')
        })

        it('duplicate-props (spread variants)', () => {
            assert.equal(transform('<p {...{prop, prop}}></p>;\n<p prop {...{prop}}></p>;\n<p {...{prop}} prop></p>;'), 'normalizeProps(newVNode(17, "p", null, null, Object.assign({}, { prop, prop })));\nnormalizeProps(newVNode(17, "p", null, null, Object.assign({}, { "prop": true }, { prop })));\nnormalizeProps(newVNode(17, "p", null, null, Object.assign({}, { prop }, { "prop": true })));')
        })

        it('duplicate-props (repeated attribute)', () => {
            expectThrows(() => transform('<p prop prop></p>;'), 'Multiple prop props are not supported. Remove the duplicate prop prop.')
        })

        it('flattens-spread', () => {
            assert.equal(transform('<p {...props}>text</p>;\n<div {...props}>{contents}</div>;\n<img alt="" {...{src, title}} />;\n<blockquote {...{cite}}>{items}</blockquote>;'), 'normalizeProps(newVNode(3, "p", null, "text", Object.assign({}, props)));\nnormalizeProps(newVNode(1, "div", null, contents, Object.assign({}, props)));\nnormalizeProps(newVNode(17, "img", null, null, Object.assign({}, { "alt": "" }, { src, title })));\nnormalizeProps(newVNode(1, "blockquote", null, items, Object.assign({}, { cite })));')
        })

        it('handle-spread-with-proto', () => {
            assert.equal(transform('<p {...{__proto__: null}}>text</p>;\n<div {...{"__proto__": null}}>{contents}</div>;'), 'normalizeProps(newVNode(3, "p", null, "text", Object.assign({}, { __proto__: null })));\nnormalizeProps(newVNode(1, "div", null, contents, Object.assign({}, { "__proto__": null })));')
        })

        it('wraps-props-in-react-spread-for-first-spread-attributes', () => {
            assert.equal(transform('<Component { ... x } y\n={2 } z />'), 'normalizeProps(newComponentVNode(0, Component, Object.assign({}, x, { "y": 2, "z": true })));')
        })

        it('wraps-props-in-react-spread-for-last-spread-attributes', () => {
            assert.equal(transform('<Component y={2} z { ... x } />'), 'normalizeProps(newComponentVNode(0, Component, Object.assign({}, { "y": 2, "z": true }, x)));')
        })

        it('wraps-props-in-react-spread-for-middle-spread-attributes', () => {
            assert.equal(transform('<Component y={2} { ... x } z />'), 'normalizeProps(newComponentVNode(0, Component, Object.assign({}, { "y": 2 }, x, { "z": true })));')
        })

        it('should-escape-xhtml-jsxtext', () => {
            const code = transform('<div>wow</div>;\n<div>wôw</div>;\n<div>w & w</div>;\n<div>w &amp; w</div>;\n<div>w &nbsp; w</div>;\n<div>this should not parse as unicode: \u00A0</div>;\n<div>this should parse as nbsp: \u00A0 </div>;\n<div>this should parse as unicode: {\'\u00A0 \'}</div>;\n<div>w &lt; w</div>;')

            assert.equal(code, 'newVNode(3, "div", null, "wow");\nnewVNode(3, "div", null, "w\\u00F4w");\nnewVNode(3, "div", null, "w & w");\nnewVNode(3, "div", null, "w & w");\nnewVNode(3, "div", null, "w \\u00A0 w");\nnewVNode(3, "div", null, "this should not parse as unicode: \\u00A0");\nnewVNode(3, "div", null, "this should parse as nbsp: \\u00A0 ");\nnewVNode(1, "div", null, [newTextVNode("this should parse as unicode: "), newTextVNode(\'\u00A0 \')]);\nnewVNode(3, "div", null, "w < w");')
            expectValidJS(code)
        })

        it('should-not-strip-nbsp-even-coupled-with-other-whitespace', () => {
            assert.equal(transform('<div>&nbsp; </div>;'), 'newVNode(3, "div", null, "\\u00A0 ");')
            assert.equal(run('<div>&nbsp; </div>').children, '\u00A0 ')
        })

        it('should-not-strip-tags-with-a-single-child-of-nbsp', () => {
            assert.equal(transform('<div>&nbsp;</div>;'), 'newVNode(3, "div", null, "\\u00A0");')
            assert.equal(run('<div>&nbsp;</div>').children, '\u00A0')
        })

        it('weird-symbols', () => {
            assert.equal(transform('class MobileHomeActivityTaskPriorityIcon extends React.PureComponent {\n  render() {\n    return <Text>&nbsp;{this.props.value}&nbsp;</Text>;\n  }\n}'), 'class MobileHomeActivityTaskPriorityIcon extends React.PureComponent {\n    render() {\n        return newComponentVNode(0, Text, { "children": ["\\u00A0", this.props.value, "\\u00A0"] });\n    }\n}')
        })

        it('dont-coerce-expression-containers', () => {
            assert.equal(transform('<Text>\n  To get started, edit index.ios.js!!!{"\\n"}\n  Press Cmd+R to reload\n</Text>'), 'newComponentVNode(0, Text, { "children": ["To get started, edit index.ios.js!!!", "\\n", "Press Cmd+R to reload"] });')
        })

        it('concatenates-adjacent-string-literals', () => {
            assert.equal(transform('var x =\n  <div>\n    foo\n    {"bar"}\n    baz\n    <div>\n      buz\n      bang\n    </div>\n    qux\n    {null}\n    quack\n  </div>'), 'var x = newVNode(1, "div", null, [newTextVNode("foo"), newTextVNode("bar"), newTextVNode("baz"), newVNode(3, "div", null, "buz bang"), newTextVNode("qux"), null, newTextVNode("quack")]);')
        })

        // TypeScript drops the comment inside the attribute expression, the output must stay valid
        it('should-insert-commas-after-expressions-before-whitespace', () => {
            const code = transform('var x =\n  <div\n    attr1={\n      "foo" + "bar"\n    }\n    attr2={\n      "foo" + "bar" +\n\n      "baz" + "bug"\n    }\n    attr3={\n      "foo" + "bar" +\n      "baz" + "bug"\n      // Extra line here.\n    }\n    attr4="baz">\n  </div>')

            assert.equal(code, 'var x = newVNode(17, "div", null, null, { "attr1": "foo" + "bar", "attr2": "foo" + "bar" +\n        "baz" + "bug", "attr3": "foo" + "bar" +\n        "baz" + "bug", "attr4": "baz" });')
            expectValidJS(code)
        })

        it('should-have-correct-comma-in-nested-children', () => {
            assert.equal(transform('var x = <div>\n  <div><br /></div>\n  <Component>{foo}<br />{bar}</Component>\n  <br />\n</div>;'), 'var x = newVNode(5, "div", null, [newVNode(9, "div", null, newVNode(17, "br")), newComponentVNode(0, Component, { "children": [foo, newVNode(17, "br"), bar] }), newVNode(17, "br")]);')
        })

        it('should-avoid-wrapping-in-extra-parens-if-not-needed', () => {
            assert.equal(transform('var x = <div>\n  <Component />\n</div>;\n\nvar x = <div>\n  {props.children}\n</div>;\n\nvar x = <Composite>\n  {props.children}\n</Composite>;\n\nvar x = <Composite>\n  <Composite2 />\n</Composite>;'), 'var x = newVNode(9, "div", null, newComponentVNode(0, Component));\nvar x = newVNode(1, "div", null, props.children);\nvar x = newComponentVNode(0, Composite, { "children": props.children });\nvar x = newComponentVNode(0, Composite, { "children": newComponentVNode(0, Composite2) });')
        })

        it('should-allow-nested-fragments', () => {
            assert.equal(transform('<div>\n  <  >\n    <>\n      <span>Hello</span>\n      <span>world</span>\n    </>\n    <>\n      <span>Goodbye</span>\n      <span>world</span>\n    </>\n  </>\n</div>'), 'newVNode(9, "div", null, newFragment(260, [newFragment(260, [newVNode(3, "span", null, "Hello"), newVNode(3, "span", null, "world")]), newFragment(260, [newVNode(3, "span", null, "Goodbye"), newVNode(3, "span", null, "world")])]));')
        })

        it('comments', () => {
            const code = transform('<div {.../*i18n*/{ id: "hello" }} />;\n<Trans /*test1 */a="1"/**test2 */b="2"/**test3 */ />;')

            assert.equal(code, 'normalizeProps(newVNode(17, "div", null, null, Object.assign({}, /*i18n*/ { id: "hello" })));\nnewComponentVNode(0, Trans /*test1 */, { "a": "1", "b": "2" });')
            expectValidJS(code)
        })
    })

    describe('babel-parser jsx fixtures', () => {
        it('basic/3', () => {
            assert.equal(transform('<a n:foo="bar"> {value} <b><c /></b></a>'), 'newVNode(1, "a", null, [newTextVNode(" "), value, newTextVNode(" "), newVNode(9, "b", null, newVNode(17, "c"))], { "n:foo": "bar" });')
        })

        it('basic/6', () => {
            assert.equal(transform('<日本語></日本語>'), 'newComponentVNode(0, 日本語);')
        })

        it('basic/11', () => {
            assert.equal(transform('<div>@test content</div>'), 'newVNode(3, "div", null, "@test content");')
        })

        it('basic/12', () => {
            assert.equal(transform('<div><br />7x invalid-js-identifier</div>'), 'newVNode(5, "div", null, [newVNode(17, "br"), newTextVNode("7x invalid-js-identifier")]);')
        })

        it('basic/16', () => {
            assert.equal(transform('(<div />) < x;'), '(newVNode(17, "div")) < x;')
        })

        it('basic/asi', () => {
            assert.equal(transform('let x\n<div />'), 'let x;\nnewVNode(17, "div");')
        })

        it('keyword-tag', () => {
            assert.equal(transform('<var></var>'), 'newVNode(17, "var");')
        })

        it('yield-tag', () => {
            assert.equal(transform('function* g() { yield <a></a>; }'), 'function* g() { yield newVNode(17, "a"); }')
        })

        it('entity', () => {
            assert.equal(transform('<A>&#x1f4a9;</A>'), 'newComponentVNode(0, A, { "children": "\\uD83D\\uDCA9" });')
            assert.equal(run('<A>&#x1f4a9;</A>', {A: 'A'}).props.children, '💩')
        })

        it('nonentity', () => {
            assert.equal(transform('<A>&#x1g4q9;</A>'), 'newComponentVNode(0, A, { "children": "&#x1g4q9;" });')
        })

        it('html-entities/code-point', () => {
            assert.equal(transform('<div>&#1234;&#xABC;&#x10ffff;</div>'), 'newVNode(3, "div", null, "\\u04D2\\u0ABC\\uDBFF\\uDFFF");')
            assert.equal(run('<div>&#1234;&#xABC;&#x10ffff;</div>').children, 'Ӓ઼\u{10FFFF}')
        })

        it('html-entities/invalid', () => {
            assert.equal(transform('<div>&amp &ampa; &amp ; &xamp; &#0_0;</div>'), 'newVNode(3, "div", null, "&amp &ampa; &amp ; &xamp; &#0_0;");')
        })

        it('fragment-5', () => {
            assert.equal(transform('<\n// comment1\n/* comment2 */\n><div/></>'), 'newFragment(260, [newVNode(17, "div")]);')
        })

        it('fragment-6', () => {
            assert.equal(transform('<><div>JSXElement</div>JSXText{"JSXExpressionContainer"}</>'), 'newFragment(256, [newVNode(3, "div", null, "JSXElement"), newTextVNode("JSXText"), newTextVNode("JSXExpressionContainer")]);')
        })

        it('regression/1', () => {
            assert.equal(transform('<p>foo <a href="test"> bar</a> baz</p>'), 'newVNode(5, "p", null, [newTextVNode("foo "), newVNode(3, "a", null, " bar", { "href": "test" }), newTextVNode(" baz")]);')
        })

        it('regression/4', () => {
            assert.equal(transform('<div>/text</div>'), 'newVNode(3, "div", null, "/text");')
        })

        it('regression/issue-2083', () => {
            assert.equal(transform('true ? (<div />) : <div />'), 'true ? (newVNode(17, "div")) : newVNode(17, "div");')
        })

        it('issue-8891', () => {
            assert.equal(transform('<div prop={{ function: "test" }} />'), 'newVNode(17, "div", null, null, { "prop": { function: "test" } });')
        })

        it('issue-11387', () => {
            assert.equal(transform('<div>{(this?.class, this.class, this?.function, this.function)}</div>'), 'newVNode(1, "div", null, (this?.class, this.class, this?.function, this.function));')
        })

        it('tsx/assignment-in-conditional-expression', () => {
            assert.equal(transform('a == 3 ? (a = <h1>123</h1>) : (a = <h1>abc</h1>)'), 'a == 3 ? (a = newVNode(3, "h1", null, "123")) : (a = newVNode(3, "h1", null, "abc"));')
        })
    })

    describe('transform-react-constant-elements fixtures', () => {
        it('magical-bindings (super)', () => {
            assert.equal(transform('class A extends B { m() { return <super.Foo/>; } }'), 'class A extends B {\n    m() { return newComponentVNode(0, super.Foo); }\n}')
        })

        it('magical-bindings (new.target)', () => {
            assert.equal(transform('function f() { return <new.target.Foo/>; }'), 'function f() { return newComponentVNode(0, new.target.Foo); }')
        })

        it('magical-bindings (arguments)', () => {
            assert.equal(transform('function f() { return <arguments.Foo/>; }'), 'function f() { return newComponentVNode(0, arguments.Foo); }')
        })

        it('lowercase-member-expression (transform-react-inline-elements)', () => {
            assert.equal(transform('<form.TestComponent />'), 'newComponentVNode(0, form.TestComponent);')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel compiles <this /> to a this reference
        it('arrow-functions (compiles <this /> to an element)', () => {
            assert.equal(
                transform('var foo = function () {\n  return () => <this />;\n};\n\nvar bar = function () {\n  return () => <this.foo />;\n};'),
                'var foo = function () {\n    return () => newVNode(17, "this");\n};\nvar bar = function () {\n    return () => newComponentVNode(0, this.foo);\n};'
            )
        })
    })

    describe('TSX variants', () => {
        it('should-allow-js-namespacing with type arguments', () => {
            assert.equal(transform('<Namespace.Component<string> />;'), 'newComponentVNode(0, Namespace.Component);')
        })

        it('should-allow-deeper-js-namespacing with type arguments', () => {
            assert.equal(transform('<Namespace.DeepNamespace.Component<Props, State> value={1} />;'), 'newComponentVNode(0, Namespace.DeepNamespace.Component, { "value": 1 });')
        })

        it('this-tag-name with type arguments', () => {
            assert.equal(transform('var div = <this.Foo<string>>test</this.Foo>;'), 'var div = newComponentVNode(0, this.Foo, { "children": "test" });')
        })

        it('assignment with a type assertion in the spread', () => {
            assert.equal(transform('var div = <Component {...(props as Props)} foo="bar" />'), 'var div = normalizeProps(newComponentVNode(0, Component, Object.assign({}, props, { "foo": "bar" })));')
        })

        it('assignment with non-null and satisfies expressions', () => {
            assert.equal(transform('var div = <Component {...props!} foo={bar satisfies string} />'), 'var div = normalizeProps(newComponentVNode(0, Component, Object.assign({}, props, { "foo": bar })));')
        })

        it('should-not-mangle-expressioncontainer-attribute-values with a type assertion', () => {
            assert.equal(transform('<button data-value={"a value\\n  with\\nnewlines" as string}>Button</button>;'), 'newVNode(3, "button", null, "Button", { "data-value": "a value\\n  with\\nnewlines" });')
        })

        it('tsx/assignment-in-conditional-expression with type annotations', () => {
            assert.equal(transform('let a: VNode;\na == 3 ? (a = <h1>123</h1> as VNode) : (a = <h1>abc</h1>!)'), 'let a;\na == 3 ? (a = newVNode(3, "h1", null, "123")) : (a = newVNode(3, "h1", null, "abc"));')
        })

        it('Should compile a generic arrow function render prop', () => {
            assert.equal(transform('<Foo render={<T,>(item: T) => <div>{item}</div>} />'), 'newComponentVNode(0, Foo, { "render": (item) => newVNode(1, "div", null, item) });')
        })
    })

    describe('TypeScript JSX transform parity', () => {
        // A string tag in tsc's React.createElement call must be an element vNode here, anything else a component
        it('Should classify tags like tsc jsx: react', () => {
            for (const tag of ['div', 'var', 'font-face', 'Foo', 'Namespace.Component', 'Namespace.DeepNamespace.Component', '日本語', 'form.TestComponent']) {
                const input = `<${tag} />`

                assert.equal(transform(input).startsWith('newVNode('), tscReact(input).startsWith('React.createElement("'), tag)
            }
        })

        it('Should decode JSX text like tsc jsx: react (should-escape-xhtml-jsxtext)', () => {
            for (const input of ['<div>wôw</div>', '<div>w & w</div>', '<div>w &amp; w</div>', '<div>w &nbsp; w</div>', '<div>this should parse as nbsp: \u00A0 </div>', '<div>w &lt; w</div>', '<div>&#x1f4a9;</div>', '<div>&#1234;&#xABC;&#x10ffff;</div>', '<div>&#x1g4q9;</div>', '<div>&amp &ampa; &amp ; &xamp; &#0_0;</div>']) {
                assert.equal(run(input).children, tscText(input), input)
            }
        })

        // tsc passes member expression tags as references, whatever their casing
        it('Should classify lowercase member expression tags like tsc jsx: react', () => {
            for (const tag of ['this.foo', 'a.b', 'this.foo.bar.qux', 'form.testComponent']) {
                const input = `<${tag} />`

                assert.equal(transform(input).startsWith('newVNode('), tscReact(input).startsWith('React.createElement("'), tag)
            }
        })
    })
})
