// Cases of swc-plugin-inferno src/jsx/tests.rs (its test! snapshot tests) that the other tests do not cover.
// The expected code is this plugin's; differences to the swc snapshots are TypeScript's, see the comments.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {commonJS, transform, transformWith} from './helpers'

describe('swc-plugin-inferno jsx tests', () => {
    // TypeScript rewrites the inferno import to inferno_1 before the plugin runs, so the helpers are required next to it
    it('Should always stick the createVNode ref to import when compiled to CommonJS', () => {
        assert.equal(transformWith('import {\n  Component,\n  createTextVNode,\n  createVNode,\n  linkEvent,\n  render,\n} from \'inferno\';\n\nconst Foo = class Clock extends Component {\n  public render() {\n    return (\n      <Collapsible>\n        <div>\n          {[<p>Hello 0</p>, <p>Hello 1</p>]}\n          <strong>Hello 2</strong>\n        </div>\n        <p>Hello 3</p>\n      </Collapsible>\n    );\n  }\n}\nrender(<Foo/>, null);', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nvar createVNode = $inferno.createVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nconst inferno_1 = require("inferno");\nconst Foo = class Clock extends inferno_1.Component {\n    render() {\n        return (createComponentVNode(2, Collapsible, { "children": [createVNode(1, "div", null, [[createVNode(1, "p", null, "Hello 0", 16), createVNode(1, "p", null, "Hello 1", 16)], createVNode(1, "strong", null, "Hello 2", 16)], 0), createVNode(1, "p", null, "Hello 3", 16)] }));\n    }\n};\n(0, inferno_1.render)(createComponentVNode(2, Foo), null);')
    })

    it('Should always stick the createVNode ref to import when compiled to ESM', () => {
        assert.equal(transformWith('import {\n  Component,\n  createTextVNode,\n  createVNode,\n  linkEvent,\n  render,\n} from \'inferno\';\n\nconst Foo = class Clock extends Component {\n  public render() {\n    return (\n      <Collapsible>\n        <div>\n          {[<p>Hello 0</p>, <p>Hello 1</p>]}\n          <strong>Hello 2</strong>\n        </div>\n        <p>Hello 3</p>\n      </Collapsible>\n    );\n  }\n}\nrender(<Foo/>, null);'), 'import { Component, render, createVNode, createComponentVNode } from \'inferno\';\nconst Foo = class Clock extends Component {\n    render() {\n        return (createComponentVNode(2, Collapsible, { "children": [createVNode(1, "div", null, [[createVNode(1, "p", null, "Hello 0", 16), createVNode(1, "p", null, "Hello 1", 16)], createVNode(1, "strong", null, "Hello 2", 16)], 0), createVNode(1, "p", null, "Hello 3", 16)] }));\n    }\n};\nrender(createComponentVNode(2, Foo), null);')
    })

    it('Should add functional component hooks to refs', () => {
        assert.equal(transform('<Child\nkey={i}\nonComponentDidAppear={childOnComponentDidAppear}\nonComponentDidMount={childOnComponentDidMount}\n>\n{i}\n</Child>'), 'createComponentVNode(2, Child, { "children": i }, i, { "onComponentDidAppear": childOnComponentDidAppear, "onComponentDidMount": childOnComponentDidMount });')
    })

    it('Should not convert text to createVNode when its within component', () => {
        assert.equal(transform('<FooBar>1</FooBar>'), 'createComponentVNode(2, FooBar, { "children": "1" });')
    })

    it('Should create text vNodes when there is single children', () => {
        assert.equal(transform('<div>foobar</div>'), 'createVNode(1, "div", null, "foobar", 16);')
    })

    it('Should lowercase certain props', () => {
        assert.equal(transform('<button accessKey="s"/>'), 'createVNode(1, "button", null, null, 1, { "accesskey": "s" });')
    })

    it('Should mark parent vNode with $HasKeyedChildren if even one child is keyed directly', () => {
        assert.equal(transform('<div><span></span><div key="1">1</div></div>'), 'createVNode(1, "div", null, [createVNode(1, "span"), createVNode(1, "div", null, "1", 16, null, "1")], 8);')
    })

    it('Should be possible to define override flags runtime', () => {
        assert.equal(transform('<img $Flags={bool ? 1 : 2}>{expression}</img>'), 'createVNode(bool ? 1 : 2, "img", null, expression, 0);')
    })

    it('Should be possible to define override flags with constant', () => {
        assert.equal(transform('<img $Flags={120}>foobar</img>'), 'createVNode(120, "img", null, "foobar", 16);')
    })

    it('Should be possible to use expression for flags', () => {
        assert.equal(transform('<ComponentA $Flags={magic}/>'), 'createComponentVNode(magic, ComponentA);')
    })

    it('Should do single normalization when multiple spread operators are used', () => {
        assert.equal(transform('<FooBar><BarFoo {...magics} {...foobars} {...props}/><NoNormalize/></FooBar>'), 'createComponentVNode(2, FooBar, { "children": [normalizeProps(createComponentVNode(2, BarFoo, Object.assign({}, magics, foobars, props))), createComponentVNode(2, NoNormalize)] });')
    })

    it('Should transform xlinkHref', () => {
        assert.equal(transform('<svg><use xlinkHref="tester"></use></svg>'), 'createVNode(32, "svg", null, createVNode(32, "use", null, null, 1, { "xlink:href": "tester" }), 2);')
    })

    it('Should transform strokeWidth', () => {
        assert.equal(transform('<svg><rect strokeWidth="1px"></rect></svg>'), 'createVNode(32, "svg", null, createVNode(32, "rect", null, null, 1, { "stroke-width": "1px" }), 2);')
    })

    it('Should not transform fillOpacity component', () => {
        assert.equal(transform('<Foobar fillOpacity="1"/>'), 'createComponentVNode(2, Foobar, { "fillOpacity": "1" });')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Should not fail if createVNode is already imported', () => {
        assert.equal(transformWith('import {createVNode} from "inferno"; var foo = <div/>;'), 'import { createVNode } from "inferno";\nvar foo = createVNode(1, "div");\nexport {};')
        assert.equal(transformWith('import {createVNode} from "inferno"; var foo = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nvar foo = createVNode(1, "div");')
    })

    it('Should create text vNodes for multiple text siblings', () => {
        assert.equal(transform('<div>Hello<span/>World</div>'), 'createVNode(1, "div", null, [createTextVNode("Hello"), createVNode(1, "span"), createTextVNode("World")], 4);')
    })

    it('Fragments syntax should createFragment dynamic children', () => {
        assert.equal(transform('<>{dynamic}</>'), 'createFragment(dynamic, 0);')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Should add import to createComponentVNode but not to createVNode if createVNode is already declared', () => {
        assert.equal(transformWith('import {createVNode} from "inferno"; var foo = <FooBar/>;'), 'import { createComponentVNode } from "inferno";\nvar foo = createComponentVNode(2, FooBar);\nexport {};')
        assert.equal(transformWith('import {createVNode} from "inferno"; var foo = <FooBar/>;', {verbatimModuleSyntax: true}), 'import { createVNode, createComponentVNode } from "inferno";\nvar foo = createComponentVNode(2, FooBar);')
    })

    it('Should convert JSX attributes to vNodes', () => {
        assert.equal(transform('<foo aasd={<span>b</span>}></foo>'), 'createVNode(1, "foo", null, null, 1, { "aasd": createVNode(1, "span", null, "b", 16) });')
    })

    it('Ported noop ported honor custom JSX comment if JSX pragma option set', () => {
        assert.equal(transform('/** @jsx dom */\n\n<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), '/** @jsx dom */\ncreateComponentVNode(2, Foo);\nvar profile = createVNode(1, "div", null, [createVNode(1, "img", "profile", null, 1, { "src": "avatar.png" }), createVNode(1, "h3", null, [user.firstName, user.lastName].join(" "), 0)], 4);')
    })

    it('Ported noop honor custom JSX comment', () => {
        assert.equal(transform('/** @jsx dom */\n\n<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), '/** @jsx dom */\ncreateComponentVNode(2, Foo);\nvar profile = createVNode(1, "div", null, [createVNode(1, "img", "profile", null, 1, { "src": "avatar.png" }), createVNode(1, "h3", null, [user.firstName, user.lastName].join(" "), 0)], 4);')
    })

    it('Ported noop honor custom JSX pragma option', () => {
        assert.equal(transform('<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), 'createComponentVNode(2, Foo);\nvar profile = createVNode(1, "div", null, [createVNode(1, "img", "profile", null, 1, { "src": "avatar.png" }), createVNode(1, "h3", null, [user.firstName, user.lastName].join(" "), 0)], 4);')
    })

    it('Ported noop JSX with retainLines option', () => {
        assert.equal(transform('var div = <div>test</div>;'), 'var div = createVNode(1, "div", null, "test", 16);')
    })

    it('Ported noop JSX without retainLines option', () => {
        assert.equal(transform('var div = <div>test</div>;'), 'var div = createVNode(1, "div", null, "test", 16);')
    })

    it('Ported noop optimisation ported constant elements', () => {
        assert.equal(transform('import {Component} from "inferno";\n\nclass App extends Component {\n  render() {\n    const navbarHeader = <div className="navbar-header">\n      <a className="navbar-brand" href="/">\n        <img src="/img/logo/logo-96x36.png" />\n      </a>\n    </div>;\n\n    return <div>\n      <nav className="navbar navbar-default">\n        <div className="container">\n          {navbarHeader}\n        </div>\n      </nav>\n    </div>;\n  }\n}'), 'class App extends Component {\n    render() {\n        const navbarHeader = createVNode(1, "div", "navbar-header", createVNode(1, "a", "navbar-brand", createVNode(1, "img", null, null, 1, { "src": "/img/logo/logo-96x36.png" }), 2, { "href": "/" }), 2);\n        return createVNode(1, "div", null, createVNode(1, "nav", "navbar navbar-default", createVNode(1, "div", "container", navbarHeader, 0), 2), 2);\n    }\n}')
    })

    it('Ported should add quotes ES3', () => {
        assert.equal(transform('var es3 = <F aaa new const var default foo-bar/>;'), 'var es3 = createComponentVNode(2, F, { "aaa": true, "new": true, "const": true, "var": true, "default": true, "foo-bar": true });')
    })

    it('Ported noop should allow no pragmaFrag if frag unused', () => {
        assert.equal(transform('/** @jsx dom */\n\n<div>no fragment is used</div>'), '/** @jsx dom */\ncreateVNode(1, "div", null, "no fragment is used", 16);')
    })

    it('Ported noop should allow pragmaFrag and frag', () => {
        assert.equal(transform('/** @jsx dom */\n/** @jsxFrag DomFrag */\n\n<></>'), '/** @jsx dom */\n/** @jsxFrag DomFrag */\ncreateFragment();')
    })

    it('Ported should escape XHTML JSXAttribute', () => {
        assert.equal(transform('<div id="wôw" />;\n<div id="\\w" />;\n<div id="w &lt; w" />;'), 'createVNode(1, "div", null, null, 1, { "id": "w\\u00F4w" });\ncreateVNode(1, "div", null, null, 1, { "id": "\\\\w" });\ncreateVNode(1, "div", null, null, 1, { "id": "w < w" });')
    })

    it('Ported should escape XHTML JSXText 1', () => {
        assert.equal(transform('<div>wow</div>;\n<div>wôw</div>;\n\n<div>w & w</div>;\n<div>w &amp; w</div>;\n\n<div>w &nbsp; w</div>;\n<div>this should parse as unicode: {\'\\u00a0 \'}</div>;\n\n<div>w &lt; w</div>;'), 'createVNode(1, "div", null, "wow", 16);\ncreateVNode(1, "div", null, "w\\u00F4w", 16);\ncreateVNode(1, "div", null, "w & w", 16);\ncreateVNode(1, "div", null, "w & w", 16);\ncreateVNode(1, "div", null, "w \\u00A0 w", 16);\ncreateVNode(1, "div", null, [createTextVNode("this should parse as unicode: "), createTextVNode(\'\\u00a0 \')], 0);\ncreateVNode(1, "div", null, "w < w", 16);')
    })

    it('Ported should escape unicode chars in attribute', () => {
        assert.equal(transform('<Bla title="Ú"/>'), 'createComponentVNode(2, Bla, { "title": "\\u00DA" });')
    })

    it('Ported should handle attributed elements', () => {
        assert.equal(transform('var HelloMessage = Inferno.createClass({\n  render: function() {\n    return <div>Hello {this.props.name}</div>;\n  }\n});\n\nInferno.render(<HelloMessage name={\n  <span>\n    Sebastian\n  </span>\n} />, mountNode);'), 'var HelloMessage = Inferno.createClass({\n    render: function () {\n        return createVNode(1, "div", null, [createTextVNode("Hello "), this.props.name], 0);\n    }\n});\nInferno.render(createComponentVNode(2, HelloMessage, { "name": createVNode(1, "span", null, "Sebastian", 16) }), mountNode);')
    })

    it('Ported should insert commas after expressions before whitespace', () => {
        assert.equal(transform('var x =\n  <div\n    attr1={\n      "foo" + "bar"\n    }\n    attr2={\n      "foo" + "bar" +\n\n      "baz" + "bug"\n    }\n    attr3={\n      "foo" + "bar" +\n      "baz" + "bug"\n    }\n    attr4="baz">\n  </div>'), 'var x = createVNode(1, "div", null, null, 1, { "attr1": "foo" + "bar", "attr2": "foo" + "bar" +\n        "baz" + "bug", "attr3": "foo" + "bar" +\n        "baz" + "bug", "attr4": "baz" });')
    })

    it('Ported noop should properly handle comments between props', () => {
        assert.equal(transform('var x = (\n  <div\n/* a multi-line\ncomment */\n    attr1="foo">\n<span // a double-slash comment\n      attr2="bar"\n    />\n  </div>\n);'), 'var x = (createVNode(1, "div", null, createVNode(1, "span", null, null, 1, { "attr2": "bar" }), 2, { "attr1": "foo" }));')
    })

    it('Ported attribute HTML entity quote', () => {
        assert.equal(transform('<Component text="Hello &quot;World&quot;" />'), 'createComponentVNode(2, Component, { "text": "Hello \\"World\\"" });')
    })

    it('Issue 229', () => {
        assert.equal(transform('const a = <>test</>\n    const b = <div>test</div>'), 'const a = createFragment([createTextVNode("test")], 4);\nconst b = createVNode(1, "div", null, "test", 16);')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Issue 351', () => {
        assert.equal(transformWith('import Inferno from \'inferno\';\n\n<div />;'), 'import { createVNode } from "inferno";\ncreateVNode(1, "div");\nexport {};')
        assert.equal(transformWith('import Inferno from \'inferno\';\n\n<div />;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nimport Inferno from \'inferno\';\ncreateVNode(1, "div");')
    })

    it('Issue 481', () => {
        assert.equal(transform('<span> {foo}</span>;'), 'createVNode(1, "span", null, [createTextVNode(" "), foo], 0);')
    })

    it('Issue 542', () => {
        assert.equal(transform('let page = <p>Click <em>New melody</em> listen to a randomly generated melody</p>'), 'let page = createVNode(1, "p", null, [createTextVNode("Click "), createVNode(1, "em", null, "New melody", 16), createTextVNode(" listen to a randomly generated melody")], 4);')
    })

    it('Module items: should transform export default JSX', () => {
        assert.equal(transform('export default function Foo() {\n    return <div>Hello</div>;\n}'), 'export default function Foo() {\n    return createVNode(1, "div", null, "Hello", 16);\n}')
    })

    it('Module items: should transform export const JSX', () => {
        assert.equal(transform('export const Bar = () => <span>World</span>;'), 'export const Bar = () => createVNode(1, "span", null, "World", 16);')
    })

    it('Module items: should transform module level JSX', () => {
        assert.equal(transform('const element = <div className="test">Hello</div>;\nexport { element };'), 'const element = createVNode(1, "div", "test", "Hello", 16);\nexport { element };')
    })

    it('Module items: should transform JSX in mixed exports', () => {
        assert.equal(transform('import { Component } from "inferno";\n\nexport default class App extends Component {\n    render() {\n        return <Main />;\n    }\n}\n\nexport const Title = () => <h1>App</h1>;'), 'export default class App extends Component {\n    render() {\n        return createComponentVNode(2, Main);\n    }\n}\nexport const Title = () => createVNode(1, "h1", null, "App", 16);')
    })

    it('Statements: should transform JSX in script', () => {
        assert.equal(transformWith('const { createVNode } = require("inferno");\nvar x = <div>Hello</div>;'), 'const { createVNode } = require("inferno");\nvar x = createVNode(1, "div", null, "Hello", 16);')
    })
})
