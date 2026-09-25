// Cases mirrored from babel-plugin-inferno's tests/preact-parity.test.js, which uses shapes from Preact's runtime tests
// (preact test/browser, compat/test/browser); Preact has no compile-output tests.
// Cases that fail because of known transformer bugs live in tests/known-bugs/preact-parity.test.ts

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

describe('Preact parity', () => {
    describe('children and text', () => {
        it('Should not merge text with a string literal child (hydrate.test)', () => {
            assert.equal(transform('<p>hello {"foo"}</p>'), 'createVNode(1, "p", null, [createTextVNode("hello "), createTextVNode("foo")], 0);')
        })

        it('Should keep text between falsy expression children (render.test)', () => {
            assert.equal(transform('<div>{null},{undefined},{false},{0},{NaN}</div>'), 'createVNode(1, "div", null, [null, createTextVNode(","), undefined, createTextVNode(","), false, createTextVNode(","), 0, createTextVNode(","), NaN], 0);')
        })

        it('Should keep text on the first and last lines around elements (render.test)', () => {
            assert.equal(transform('<div>0<span />\n<input />\n<div />1</div>'), 'createVNode(1, "div", null, [createTextVNode("0"), createVNode(1, "span"), createVNode(64, "input"), createVNode(1, "div"), createTextVNode("1")], 4);')
        })

        it('Should keep the trailing space before an element (render.test)', () => {
            assert.equal(transform('<div>hello <span>world</span></div>'), 'createVNode(1, "div", null, [createTextVNode("hello "), createVNode(1, "span", null, "world", 16)], 4);')
        })

        it('Should keep quotes and = in text (render.test)', () => {
            assert.equal(transform('<a href="#">href="#"</a>'), 'createVNode(1, "a", null, "href=\\"#\\"", 16, { "href": "#" });')
        })

        it('Should split text and an expression without space (render.test)', () => {
            assert.equal(transform('<h1 class="fade-down">Hi{name}</h1>'), 'createVNode(1, "h1", "fade-down", [createTextVNode("Hi"), name], 0);')
        })

        it('Should pass an array children prop to a component (createElement.test)', () => {
            assert.equal(transform('<Foo a="b" children={[<span class="bar">bar</span>, "123", 456]} />'), 'createComponentVNode(2, Foo, { "a": "b", "children": [createVNode(1, "span", "bar", "bar", 16), "123", 456] });')
        })

        it('Should prefer JSX children over an array children prop (render.test)', () => {
            assert.equal(transform('<div a children={["a", "b"]}>c</div>'), 'createVNode(1, "div", null, "c", 16, { "a": true });')
        })

        it('Should compile a function child of a lowercase consumer (createContext.test)', () => {
            assert.equal(transform('<context.Consumer>{v => <p>{v.state}</p>}</context.Consumer>'), 'createComponentVNode(2, context.Consumer, { "children": v => createVNode(1, "p", null, v.state, 0) });')
        })
    })

    describe('spread (compat tests)', () => {
        it('Should keep several spreads', () => {
            assert.equal(transform('<Inner {...data} {...childData} />'), 'normalizeProps(createComponentVNode(2, Inner, Object.assign({}, data, childData)));')
        })

        it('Should keep class before a spread', () => {
            assert.equal(transform('<ul class="old" {...props} />'), 'normalizeProps(createVNode(1, "ul", "old", null, 1, Object.assign({}, props)));')
        })

        it('Should keep a template literal className before a spread', () => {
            assert.equal(transform('<div className={`${className} foo`} {...props} />'), 'normalizeProps(createVNode(1, "div", `${className} foo`, null, 1, Object.assign({}, props)));')
        })

        it('Should keep a key after a spread of an object with a nested spread', () => {
            assert.equal(transform('<ListItem {...{ isSelected, setSelected, ...item }} key={item.name} />'), 'normalizeProps(createComponentVNode(2, ListItem, Object.assign({}, { isSelected, setSelected, ...item }), item.name));')
        })

        it('Should keep a conditional class expression on svg', () => {
            assert.equal(transform('<svg class={c && "bar_" + c} />'), 'createVNode(32, "svg", c && "bar_" + c);')
        })
    })

    describe('attribute values', () => {
        it('Should pass falsy attribute values verbatim', () => {
            assert.equal(transform('<div a0={0} anull={null} anan={NaN} afalse={false} />'), 'createVNode(1, "div", null, null, 1, { "a0": 0, "anull": null, "anan": NaN, "afalse": false });')
        })

        it('Should pass boolean-like attributes verbatim', () => {
            assert.equal(transform('<a download popover translate={false} aria-checked={false} data-checked={false} />'), 'createVNode(1, "a", null, null, 1, { "download": true, "popover": true, "translate": false, "aria-checked": false, "data-checked": false });')
        })

        it('Should pass a style string', () => {
            assert.equal(transform('<div style="top: 5px; position: relative;" />'), 'createVNode(1, "div", null, null, 1, { "style": "top: 5px; position: relative;" });')
        })

        it('Should pass a style object with mixed key styles', () => {
            assert.equal(transform('<div style={{gridRowStart: 1, opacity: 0, "--fooBar": 1, "background-size": "cover"}} />'), 'createVNode(1, "div", null, null, 1, { "style": { gridRowStart: 1, opacity: 0, "--fooBar": 1, "background-size": "cover" } });')
        })

        it('Should pass a false table border', () => {
            assert.equal(transform('<table border={false} />'), 'createVNode(1, "table", null, null, 1, { "border": false });')
        })
    })

    describe('form controls', () => {
        it('Should compile a multiple select with an array value', () => {
            assert.equal(transform('<select multiple value={["B", "C"]}><option selected value="B">B</option></select>'), 'createVNode(256, "select", null, createVNode(1, "option", null, "B", 16, { "selected": true, "value": "B" }), 2, { "multiple": true, "value": ["B", "C"] });')
        })

        it('Should compile a select with defaultValue', () => {
            assert.equal(transform('<select defaultValue="2"><option value="2">2</option></select>'), 'createVNode(256, "select", null, createVNode(1, "option", null, "2", 16, { "value": "2" }), 2, { "defaultValue": "2" });')
        })

        it('Should compile a textarea with defaultValue', () => {
            assert.equal(transform('<textarea defaultValue="foo" />'), 'createVNode(128, "textarea", null, null, 1, { "defaultValue": "foo" });')
        })

        it('Should compile a textarea with a null value', () => {
            assert.equal(transform('<textarea value={null} />'), 'createVNode(128, "textarea", null, null, 1, { "value": null });')
        })

        it('Should compile a range input', () => {
            assert.equal(transform('<input type="range" value={0.5} min="0" max="1" step="0.05" />'), 'createVNode(64, "input", null, null, 1, { "type": "range", "value": 0.5, "min": "0", "max": "1", "step": "0.05" });')
        })

        it('Should compile defaultChecked with checked false', () => {
            assert.equal(transform('<input defaultChecked checked={false} />'), 'createVNode(64, "input", null, null, 1, { "defaultChecked": true, "checked": false });')
        })

        it('Should compile a progress element', () => {
            assert.equal(transform('<progress value={50} max="100" />'), 'createVNode(1, "progress", null, null, 1, { "value": 50, "max": "100" });')
        })
    })

    describe('tags', () => {
        it('Should compile annotation-xml as an element', () => {
            assert.equal(transform('<annotation-xml encoding="text/html" />'), 'createVNode(1, "annotation-xml", null, null, 1, { "encoding": "text/html" });')
        })

        it('Should compile new html tags', () => {
            assert.equal(transform('<search><selectedcontent /></search>'), 'createVNode(1, "search", null, createVNode(1, "selectedcontent"), 2);')
        })

        it('Should compile keyed children of a template', () => {
            assert.equal(transform('<template>{items.map(i => <li key={i}>{i}</li>)}</template>'), 'createVNode(1, "template", null, items.map(i => createVNode(1, "li", null, i, 0, null, i)), 0);')
        })

        it('Should keep an explicit xmlns on svg', () => {
            assert.equal(transform('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" />'), 'createVNode(32, "svg", null, null, 1, { "xmlns": "http://www.w3.org/2000/svg", "viewBox": "0 0 1 1" });')
        })

        it('Should keep the is attribute', () => {
            assert.equal(transform('<div is="built-in" />'), 'createVNode(1, "div", null, null, 1, { "is": "built-in" });')
        })
    })

    // Invalid nesting and handler shapes compile normally; validation is left to the runtime
    describe('shapes rejected by preact/debug', () => {
        it('Should compile a div inside a paragraph', () => {
            assert.equal(transform('<p><div /></p>'), 'createVNode(1, "p", null, createVNode(1, "div"), 2);')
        })

        it('Should compile nested anchors', () => {
            assert.equal(transform('<a><a /></a>'), 'createVNode(1, "a", null, createVNode(1, "a"), 2);')
        })

        it('Should compile nested buttons', () => {
            assert.equal(transform('<button><button /></button>'), 'createVNode(1, "button", null, createVNode(1, "button"), 2);')
        })

        it('Should compile a table row inside a div', () => {
            assert.equal(transform('<div><tr /></div>'), 'createVNode(1, "div", null, createVNode(1, "tr"), 2);')
        })

        it('Should compile a table cell inside tbody', () => {
            assert.equal(transform('<tbody><td /></tbody>'), 'createVNode(1, "tbody", null, createVNode(1, "td"), 2);')
        })

        it('Should compile a complete table', () => {
            assert.equal(transform('<table><tbody><tr><td /></tr></tbody></table>'), 'createVNode(1, "table", null, createVNode(1, "tbody", null, createVNode(1, "tr", null, createVNode(1, "td"), 2), 2), 2);')
        })
    })

    describe('TSX variants', () => {
        it('Should pass a const asserted array children prop to a component', () => {
            assert.equal(transform('<Foo a="b" children={[<span class="bar">bar</span>, "123", 456] as const} />'), 'createComponentVNode(2, Foo, { "a": "b", "children": [createVNode(1, "span", "bar", "bar", 16), "123", 456] });')
        })

        it('Should compile a typed function child of a lowercase consumer', () => {
            assert.equal(transform('<context.Consumer>{(v: State) => <p>{v.state}</p>}</context.Consumer>'), 'createComponentVNode(2, context.Consumer, { "children": (v) => createVNode(1, "p", null, v.state, 0) });')
        })

        it('Should keep a key after a spread on a generic component', () => {
            assert.equal(transform('<ListItem<Item> {...{ isSelected, setSelected, ...item }} key={item.name} />'), 'normalizeProps(createComponentVNode(2, ListItem, Object.assign({}, { isSelected, setSelected, ...item }), item.name));')
        })

        it('Should compile a multiple select with a satisfies array value', () => {
            assert.equal(transform('<select multiple value={["B", "C"] satisfies string[]}><option selected value="B">B</option></select>'), 'createVNode(256, "select", null, createVNode(1, "option", null, "B", 16, { "selected": true, "value": "B" }), 2, { "multiple": true, "value": ["B", "C"] });')
        })
    })
})
