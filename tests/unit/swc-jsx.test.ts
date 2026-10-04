// Cases of swc-plugin-inferno src/jsx/tests.rs (its test! snapshot tests) that the other tests do not cover.
// The expected code is this plugin's; differences to the swc snapshots are TypeScript's, see the comments.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {commonJS, transform, transformWith} from './helpers'

describe('swc-plugin-inferno jsx tests', () => {
    // TypeScript rewrites the inferno import to inferno_1 before the plugin runs, so the helpers are required next to it
    it('Should always stick the newVNode ref to import when compiled to CommonJS', () => {
        assert.equal(transformWith('import {\n  Component,\n  newTextVNode,\n  newVNode,\n  linkEvent,\n  render,\n} from \'inferno\';\n\nconst Foo = class Clock extends Component {\n  public render() {\n    return (\n      <Collapsible>\n        <div>\n          {[<p>Hello 0</p>, <p>Hello 1</p>]}\n          <strong>Hello 2</strong>\n        </div>\n        <p>Hello 3</p>\n      </Collapsible>\n    );\n  }\n}\nrender(<Foo/>, null);', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar newVNode = $inferno.newVNode;\nvar newComponentVNode = $inferno.newComponentVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nconst inferno_1 = require("inferno");\nconst Foo = class Clock extends inferno_1.Component {\n    render() {\n        return (newComponentVNode(0, Collapsible, { "children": [newVNode(1, "div", null, [[newVNode(3, "p", null, "Hello 0"), newVNode(3, "p", null, "Hello 1")], newVNode(3, "strong", null, "Hello 2")]), newVNode(3, "p", null, "Hello 3")] }));\n    }\n};\n(0, inferno_1.render)(newComponentVNode(0, Foo), null);')
    })

    it('Should always stick the newVNode ref to import when compiled to ESM', () => {
        assert.equal(transformWith('import {\n  Component,\n  newTextVNode,\n  newVNode,\n  linkEvent,\n  render,\n} from \'inferno\';\n\nconst Foo = class Clock extends Component {\n  public render() {\n    return (\n      <Collapsible>\n        <div>\n          {[<p>Hello 0</p>, <p>Hello 1</p>]}\n          <strong>Hello 2</strong>\n        </div>\n        <p>Hello 3</p>\n      </Collapsible>\n    );\n  }\n}\nrender(<Foo/>, null);'), 'import { Component, render, newVNode, newComponentVNode } from \'inferno\';\nconst Foo = class Clock extends Component {\n    render() {\n        return (newComponentVNode(0, Collapsible, { "children": [newVNode(1, "div", null, [[newVNode(3, "p", null, "Hello 0"), newVNode(3, "p", null, "Hello 1")], newVNode(3, "strong", null, "Hello 2")]), newVNode(3, "p", null, "Hello 3")] }));\n    }\n};\nrender(newComponentVNode(0, Foo), null);')
    })

    it('Should add functional component hooks to refs', () => {
        assert.equal(transform('<Child\nkey={i}\nonComponentDidAppear={childOnComponentDidAppear}\nonComponentDidMount={childOnComponentDidMount}\n>\n{i}\n</Child>'), 'newComponentVNode(0, Child, { "children": i }, i, { "onComponentDidAppear": childOnComponentDidAppear, "onComponentDidMount": childOnComponentDidMount });')
    })

    it('Should not convert text to newVNode when its within component', () => {
        assert.equal(transform('<FooBar>1</FooBar>'), 'newComponentVNode(0, FooBar, { "children": "1" });')
    })

    it('Should create text vNodes when there is single children', () => {
        assert.equal(transform('<div>foobar</div>'), 'newVNode(3, "div", null, "foobar");')
    })

    it('Should lowercase certain props', () => {
        assert.equal(transform('<button accessKey="s"/>'), 'newVNode(17, "button", null, null, { "accesskey": "s" });')
    })

    it('Should mark parent vNode with $HasKeyedChildren if even one child is keyed directly', () => {
        assert.equal(transform('<div><span></span><div key="1">1</div></div>'), 'newVNode(33, "div", null, [newVNode(17, "span"), newVNode(3, "div", null, "1", null, "1")]);')
    })

    it('Should be possible to define override flags runtime', () => {
        assert.equal(transform('<img $Flags={bool ? 1 : 2}>{expression}</img>'), 'newVNode(bool ? 1 : 2, "img", null, expression);')
    })

    it('Should be possible to define override flags with constant', () => {
        assert.equal(transform('<img $Flags={120}>foobar</img>'), 'newVNode(122, "img", null, "foobar");')
    })

    it('Should be possible to use expression for flags', () => {
        assert.equal(transform('<ComponentA $Flags={magic}/>'), 'newComponentVNode(magic | 16, ComponentA);')
    })

    it('Should do single normalization when multiple spread operators are used', () => {
        assert.equal(transform('<FooBar><BarFoo {...magics} {...foobars} {...props}/><NoNormalize/></FooBar>'), 'newComponentVNode(0, FooBar, { "children": [normalizeProps(newComponentVNode(0, BarFoo, Object.assign({}, magics, foobars, props))), newComponentVNode(0, NoNormalize)] });')
    })

    it('Should transform xlinkHref', () => {
        assert.equal(transform('<svg><use xlinkHref="tester"></use></svg>'), 'newVNode(72, "svg", null, newVNode(80, "use", null, null, { "xlink:href": "tester" }));')
    })

    it('Should transform strokeWidth', () => {
        assert.equal(transform('<svg><rect strokeWidth="1px"></rect></svg>'), 'newVNode(72, "svg", null, newVNode(80, "rect", null, null, { "stroke-width": "1px" }));')
    })

    it('Should not transform fillOpacity component', () => {
        assert.equal(transform('<Foobar fillOpacity="1"/>'), 'newComponentVNode(0, Foobar, { "fillOpacity": "1" });')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Should not fail if newVNode is already imported', () => {
        assert.equal(transformWith('import {newVNode} from "inferno"; var foo = <div/>;'), 'import { newVNode } from "inferno";\nvar foo = newVNode(17, "div");\nexport {};')
        assert.equal(transformWith('import {newVNode} from "inferno"; var foo = <div/>;', {verbatimModuleSyntax: true}), 'import { newVNode } from "inferno";\nvar foo = newVNode(17, "div");')
    })

    it('Should create text vNodes for multiple text siblings', () => {
        assert.equal(transform('<div>Hello<span/>World</div>'), 'newVNode(5, "div", null, [newTextVNode("Hello"), newVNode(17, "span"), newTextVNode("World")]);')
    })

    it('Fragments syntax should newFragment dynamic children', () => {
        assert.equal(transform('<>{dynamic}</>'), 'newFragment(256, dynamic);')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Should add import to newComponentVNode but not to newVNode if newVNode is already declared', () => {
        assert.equal(transformWith('import {newVNode} from "inferno"; var foo = <FooBar/>;'), 'import { newComponentVNode } from "inferno";\nvar foo = newComponentVNode(0, FooBar);\nexport {};')
        assert.equal(transformWith('import {newVNode} from "inferno"; var foo = <FooBar/>;', {verbatimModuleSyntax: true}), 'import { newVNode, newComponentVNode } from "inferno";\nvar foo = newComponentVNode(0, FooBar);')
    })

    it('Should convert JSX attributes to vNodes', () => {
        assert.equal(transform('<foo aasd={<span>b</span>}></foo>'), 'newVNode(17, "foo", null, null, { "aasd": newVNode(3, "span", null, "b") });')
    })

    it('Ported noop ported honor custom JSX comment if JSX pragma option set', () => {
        assert.equal(transform('/** @jsx dom */\n\n<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), '/** @jsx dom */\nnewComponentVNode(0, Foo);\nvar profile = newVNode(5, "div", null, [newVNode(17, "img", "profile", null, { "src": "avatar.png" }), newVNode(1, "h3", null, [user.firstName, user.lastName].join(" "))]);')
    })

    it('Ported noop honor custom JSX comment', () => {
        assert.equal(transform('/** @jsx dom */\n\n<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), '/** @jsx dom */\nnewComponentVNode(0, Foo);\nvar profile = newVNode(5, "div", null, [newVNode(17, "img", "profile", null, { "src": "avatar.png" }), newVNode(1, "h3", null, [user.firstName, user.lastName].join(" "))]);')
    })

    it('Ported noop honor custom JSX pragma option', () => {
        assert.equal(transform('<Foo></Foo>;\n\nvar profile = <div>\n  <img src="avatar.png" className="profile" />\n  <h3>{[user.firstName, user.lastName].join(" ")}</h3>\n</div>;'), 'newComponentVNode(0, Foo);\nvar profile = newVNode(5, "div", null, [newVNode(17, "img", "profile", null, { "src": "avatar.png" }), newVNode(1, "h3", null, [user.firstName, user.lastName].join(" "))]);')
    })

    it('Ported noop JSX with retainLines option', () => {
        assert.equal(transform('var div = <div>test</div>;'), 'var div = newVNode(3, "div", null, "test");')
    })

    it('Ported noop JSX without retainLines option', () => {
        assert.equal(transform('var div = <div>test</div>;'), 'var div = newVNode(3, "div", null, "test");')
    })

    it('Ported noop optimisation ported constant elements', () => {
        assert.equal(transform('import {Component} from "inferno";\n\nclass App extends Component {\n  render() {\n    const navbarHeader = <div className="navbar-header">\n      <a className="navbar-brand" href="/">\n        <img src="/img/logo/logo-96x36.png" />\n      </a>\n    </div>;\n\n    return <div>\n      <nav className="navbar navbar-default">\n        <div className="container">\n          {navbarHeader}\n        </div>\n      </nav>\n    </div>;\n  }\n}'), 'class App extends Component {\n    render() {\n        const navbarHeader = newVNode(9, "div", "navbar-header", newVNode(9, "a", "navbar-brand", newVNode(17, "img", null, null, { "src": "/img/logo/logo-96x36.png" }), { "href": "/" }));\n        return newVNode(9, "div", null, newVNode(9, "nav", "navbar navbar-default", newVNode(1, "div", "container", navbarHeader)));\n    }\n}')
    })

    it('Ported should add quotes ES3', () => {
        assert.equal(transform('var es3 = <F aaa new const var default foo-bar/>;'), 'var es3 = newComponentVNode(0, F, { "aaa": true, "new": true, "const": true, "var": true, "default": true, "foo-bar": true });')
    })

    it('Ported noop should allow no pragmaFrag if frag unused', () => {
        assert.equal(transform('/** @jsx dom */\n\n<div>no fragment is used</div>'), '/** @jsx dom */\nnewVNode(3, "div", null, "no fragment is used");')
    })

    it('Ported noop should allow pragmaFrag and frag', () => {
        assert.equal(transform('/** @jsx dom */\n/** @jsxFrag DomFrag */\n\n<></>'), '/** @jsx dom */\n/** @jsxFrag DomFrag */\nnewFragment(272);')
    })

    it('Ported should escape XHTML JSXAttribute', () => {
        assert.equal(transform('<div id="wôw" />;\n<div id="\\w" />;\n<div id="w &lt; w" />;'), 'newVNode(17, "div", null, null, { "id": "w\\u00F4w" });\nnewVNode(17, "div", null, null, { "id": "\\\\w" });\nnewVNode(17, "div", null, null, { "id": "w < w" });')
    })

    it('Ported should escape XHTML JSXText 1', () => {
        assert.equal(transform('<div>wow</div>;\n<div>wôw</div>;\n\n<div>w & w</div>;\n<div>w &amp; w</div>;\n\n<div>w &nbsp; w</div>;\n<div>this should parse as unicode: {\'\\u00a0 \'}</div>;\n\n<div>w &lt; w</div>;'), 'newVNode(3, "div", null, "wow");\nnewVNode(3, "div", null, "w\\u00F4w");\nnewVNode(3, "div", null, "w & w");\nnewVNode(3, "div", null, "w & w");\nnewVNode(3, "div", null, "w \\u00A0 w");\nnewVNode(1, "div", null, [newTextVNode("this should parse as unicode: "), newTextVNode(\'\\u00a0 \')]);\nnewVNode(3, "div", null, "w < w");')
    })

    it('Ported should escape unicode chars in attribute', () => {
        assert.equal(transform('<Bla title="Ú"/>'), 'newComponentVNode(0, Bla, { "title": "\\u00DA" });')
    })

    it('Ported should handle attributed elements', () => {
        assert.equal(transform('var HelloMessage = Inferno.createClass({\n  render: function() {\n    return <div>Hello {this.props.name}</div>;\n  }\n});\n\nInferno.render(<HelloMessage name={\n  <span>\n    Sebastian\n  </span>\n} />, mountNode);'), 'var HelloMessage = Inferno.createClass({\n    render: function () {\n        return newVNode(1, "div", null, [newTextVNode("Hello "), this.props.name]);\n    }\n});\nInferno.render(newComponentVNode(0, HelloMessage, { "name": newVNode(3, "span", null, "Sebastian") }), mountNode);')
    })

    it('Ported should insert commas after expressions before whitespace', () => {
        assert.equal(transform('var x =\n  <div\n    attr1={\n      "foo" + "bar"\n    }\n    attr2={\n      "foo" + "bar" +\n\n      "baz" + "bug"\n    }\n    attr3={\n      "foo" + "bar" +\n      "baz" + "bug"\n    }\n    attr4="baz">\n  </div>'), 'var x = newVNode(17, "div", null, null, { "attr1": "foo" + "bar", "attr2": "foo" + "bar" +\n        "baz" + "bug", "attr3": "foo" + "bar" +\n        "baz" + "bug", "attr4": "baz" });')
    })

    it('Ported noop should properly handle comments between props', () => {
        assert.equal(transform('var x = (\n  <div\n/* a multi-line\ncomment */\n    attr1="foo">\n<span // a double-slash comment\n      attr2="bar"\n    />\n  </div>\n);'), 'var x = (newVNode(9, "div", null, newVNode(17, "span", null, null, { "attr2": "bar" }), { "attr1": "foo" }));')
    })

    it('Ported attribute HTML entity quote', () => {
        assert.equal(transform('<Component text="Hello &quot;World&quot;" />'), 'newComponentVNode(0, Component, { "text": "Hello \\"World\\"" });')
    })

    it('Issue 229', () => {
        assert.equal(transform('const a = <>test</>\n    const b = <div>test</div>'), 'const a = newFragment(260, [newTextVNode("test")]);\nconst b = newVNode(3, "div", null, "test");')
    })

    // TypeScript elides the unused inferno import before the plugin runs; with verbatimModuleSyntax it stays
    it('Issue 351', () => {
        assert.equal(transformWith('import Inferno from \'inferno\';\n\n<div />;'), 'import { newVNode } from "inferno";\nnewVNode(17, "div");\nexport {};')
        assert.equal(transformWith('import Inferno from \'inferno\';\n\n<div />;', {verbatimModuleSyntax: true}), 'import { newVNode } from "inferno";\nimport Inferno from \'inferno\';\nnewVNode(17, "div");')
    })

    it('Issue 481', () => {
        assert.equal(transform('<span> {foo}</span>;'), 'newVNode(1, "span", null, [newTextVNode(" "), foo]);')
    })

    it('Issue 542', () => {
        assert.equal(transform('let page = <p>Click <em>New melody</em> listen to a randomly generated melody</p>'), 'let page = newVNode(5, "p", null, [newTextVNode("Click "), newVNode(3, "em", null, "New melody"), newTextVNode(" listen to a randomly generated melody")]);')
    })

    it('Module items: should transform export default JSX', () => {
        assert.equal(transform('export default function Foo() {\n    return <div>Hello</div>;\n}'), 'export default function Foo() {\n    return newVNode(3, "div", null, "Hello");\n}')
    })

    it('Module items: should transform export const JSX', () => {
        assert.equal(transform('export const Bar = () => <span>World</span>;'), 'export const Bar = () => newVNode(3, "span", null, "World");')
    })

    it('Module items: should transform module level JSX', () => {
        assert.equal(transform('const element = <div className="test">Hello</div>;\nexport { element };'), 'const element = newVNode(3, "div", "test", "Hello");\nexport { element };')
    })

    it('Module items: should transform JSX in mixed exports', () => {
        assert.equal(transform('import { Component } from "inferno";\n\nexport default class App extends Component {\n    render() {\n        return <Main />;\n    }\n}\n\nexport const Title = () => <h1>App</h1>;'), 'export default class App extends Component {\n    render() {\n        return newComponentVNode(0, Main);\n    }\n}\nexport const Title = () => newVNode(3, "h1", null, "App");')
    })

    it('Statements: should transform JSX in script', () => {
        assert.equal(transformWith('const { newVNode } = require("inferno");\nvar x = <div>Hello</div>;'), 'const { newVNode } = require("inferno");\nvar x = newVNode(3, "div", null, "Hello");')
    })
})
