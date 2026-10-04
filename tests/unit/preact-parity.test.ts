// Cases mirrored from babel-plugin-inferno's tests/preact-parity.test.js, which uses shapes from Preact's runtime tests
// (preact test/browser, compat/test/browser); Preact has no compile-output tests.

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

describe('Preact parity', () => {
    describe('children and text', () => {
        it('Should not merge text with a string literal child (hydrate.test)', () => {
            assert.equal(transform('<p>hello {"foo"}</p>'), 'newVNode(1, "p", null, [newTextVNode("hello "), newTextVNode("foo")]);')
        })

        it('Should keep text between falsy expression children (render.test)', () => {
            assert.equal(transform('<div>{null},{undefined},{false},{0},{NaN}</div>'), 'newVNode(1, "div", null, [null, newTextVNode(","), undefined, newTextVNode(","), false, newTextVNode(","), 0, newTextVNode(","), NaN]);')
        })

        it('Should keep text on the first and last lines around elements (render.test)', () => {
            assert.equal(transform('<div>0<span />\n<input />\n<div />1</div>'), 'newVNode(5, "div", null, [newTextVNode("0"), newVNode(17, "span"), newVNode(528, "input"), newVNode(17, "div"), newTextVNode("1")]);')
        })

        it('Should keep the trailing space before an element (render.test)', () => {
            assert.equal(transform('<div>hello <span>world</span></div>'), 'newVNode(5, "div", null, [newTextVNode("hello "), newVNode(3, "span", null, "world")]);')
        })

        it('Should keep quotes and = in text (render.test)', () => {
            assert.equal(transform('<a href="#">href="#"</a>'), 'newVNode(3, "a", null, "href=\\"#\\"", { "href": "#" });')
        })

        it('Should split text and an expression without space (render.test)', () => {
            assert.equal(transform('<h1 class="fade-down">Hi{name}</h1>'), 'newVNode(1, "h1", "fade-down", [newTextVNode("Hi"), name]);')
        })

        it('Should pass an array children prop to a component (createElement.test)', () => {
            assert.equal(transform('<Foo a="b" children={[<span class="bar">bar</span>, "123", 456]} />'), 'newComponentVNode(0, Foo, { "a": "b", "children": [newVNode(3, "span", "bar", "bar"), "123", 456] });')
        })

        it('Should prefer JSX children over an array children prop (render.test)', () => {
            assert.equal(transform('<div a children={["a", "b"]}>c</div>'), 'newVNode(3, "div", null, "c", { "a": true });')
        })

        it('Should compile a function child of a lowercase consumer (createContext.test)', () => {
            assert.equal(transform('<context.Consumer>{v => <p>{v.state}</p>}</context.Consumer>'), 'newComponentVNode(0, context.Consumer, { "children": v => newVNode(1, "p", null, v.state) });')
        })
    })

    describe('spread (compat tests)', () => {
        it('Should keep several spreads', () => {
            assert.equal(transform('<Inner {...data} {...childData} />'), 'normalizeProps(newComponentVNode(0, Inner, Object.assign({}, data, childData)));')
        })

        it('Should keep class before a spread', () => {
            assert.equal(transform('<ul class="old" {...props} />'), 'normalizeProps(newVNode(17, "ul", "old", null, Object.assign({}, props)));')
        })

        it('Should keep a template literal className before a spread', () => {
            assert.equal(transform('<div className={`${className} foo`} {...props} />'), 'normalizeProps(newVNode(17, "div", `${className} foo`, null, Object.assign({}, props)));')
        })

        it('Should keep a key after a spread of an object with a nested spread', () => {
            assert.equal(transform('<ListItem {...{ isSelected, setSelected, ...item }} key={item.name} />'), 'normalizeProps(newComponentVNode(0, ListItem, Object.assign({}, { isSelected, setSelected, ...item }), item.name));')
        })

        it('Should keep a conditional class expression on svg', () => {
            assert.equal(transform('<svg class={c && "bar_" + c} />'), 'newVNode(80, "svg", c && "bar_" + c);')
        })
    })

    describe('attribute values', () => {
        it('Should pass falsy attribute values verbatim', () => {
            assert.equal(transform('<div a0={0} anull={null} anan={NaN} afalse={false} />'), 'newVNode(17, "div", null, null, { "a0": 0, "anull": null, "anan": NaN, "afalse": false });')
        })

        it('Should pass boolean-like attributes verbatim', () => {
            assert.equal(transform('<a download popover translate={false} aria-checked={false} data-checked={false} />'), 'newVNode(17, "a", null, null, { "download": true, "popover": true, "translate": false, "aria-checked": false, "data-checked": false });')
        })

        it('Should pass a style string', () => {
            assert.equal(transform('<div style="top: 5px; position: relative;" />'), 'newVNode(17, "div", null, null, { "style": "top: 5px; position: relative;" });')
        })

        it('Should pass a style object with mixed key styles', () => {
            assert.equal(transform('<div style={{gridRowStart: 1, opacity: 0, "--fooBar": 1, "background-size": "cover"}} />'), 'newVNode(17, "div", null, null, { "style": { gridRowStart: 1, opacity: 0, "--fooBar": 1, "background-size": "cover" } });')
        })

        it('Should pass a false table border', () => {
            assert.equal(transform('<table border={false} />'), 'newVNode(17, "table", null, null, { "border": false });')
        })

        it('Should lowercase rowSpan and colSpan', () => {
            assert.equal(transform('<td rowSpan={2} colSpan={2} />'), 'newVNode(17, "td", null, null, { "rowspan": 2, "colspan": 2 });')
        })

        it('Should lowercase null maxLength and minLength', () => {
            assert.equal(transform('<input maxLength={null} minLength={null} />'), 'newVNode(528, "input", null, null, { "maxlength": null, "minlength": null });')
        })
    })

    describe('form controls', () => {
        it('Should compile a multiple select with an array value', () => {
            assert.equal(transform('<select multiple value={["B", "C"]}><option selected value="B">B</option></select>'), 'newVNode(4104, "select", null, newVNode(3, "option", null, "B", { "selected": true, "value": "B" }), { "multiple": true, "value": ["B", "C"] });')
        })

        it('Should compile a select with defaultValue', () => {
            assert.equal(transform('<select defaultValue="2"><option value="2">2</option></select>'), 'newVNode(4104, "select", null, newVNode(3, "option", null, "2", { "value": "2" }), { "defaultValue": "2" });')
        })

        it('Should compile a textarea with defaultValue', () => {
            assert.equal(transform('<textarea defaultValue="foo" />'), 'newVNode(2064, "textarea", null, null, { "defaultValue": "foo" });')
        })

        it('Should compile a textarea with a null value', () => {
            assert.equal(transform('<textarea value={null} />'), 'newVNode(2064, "textarea", null, null, { "value": null });')
        })

        it('Should compile a range input', () => {
            assert.equal(transform('<input type="range" value={0.5} min="0" max="1" step="0.05" />'), 'newVNode(528, "input", null, null, { "type": "range", "value": 0.5, "min": "0", "max": "1", "step": "0.05" });')
        })

        it('Should compile defaultChecked with checked false', () => {
            assert.equal(transform('<input defaultChecked checked={false} />'), 'newVNode(528, "input", null, null, { "defaultChecked": true, "checked": false });')
        })

        it('Should compile a progress element', () => {
            assert.equal(transform('<progress value={50} max="100" />'), 'newVNode(17, "progress", null, null, { "value": 50, "max": "100" });')
        })
    })

    describe('tags', () => {
        it('Should compile annotation-xml as an element', () => {
            assert.equal(transform('<annotation-xml encoding="text/html" />'), 'newVNode(17, "annotation-xml", null, null, { "encoding": "text/html" });')
        })

        it('Should compile new html tags', () => {
            assert.equal(transform('<search><selectedcontent /></search>'), 'newVNode(9, "search", null, newVNode(17, "selectedcontent"));')
        })

        it('Should compile keyed children of a template', () => {
            assert.equal(transform('<template>{items.map(i => <li key={i}>{i}</li>)}</template>'), 'newVNode(1, "template", null, items.map(i => newVNode(1, "li", null, i, null, i)));')
        })

        it('Should keep an explicit xmlns on svg', () => {
            assert.equal(transform('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" />'), 'newVNode(80, "svg", null, null, { "xmlns": "http://www.w3.org/2000/svg", "viewBox": "0 0 1 1" });')
        })

        it('Should keep the is attribute', () => {
            assert.equal(transform('<div is="built-in" />'), 'newVNode(17, "div", null, null, { "is": "built-in" });')
        })
    })

    // Invalid nesting and handler shapes compile normally; validation is left to the runtime
    describe('shapes rejected by preact/debug', () => {
        it('Should compile a div inside a paragraph', () => {
            assert.equal(transform('<p><div /></p>'), 'newVNode(9, "p", null, newVNode(17, "div"));')
        })

        it('Should compile nested anchors', () => {
            assert.equal(transform('<a><a /></a>'), 'newVNode(9, "a", null, newVNode(17, "a"));')
        })

        it('Should compile nested buttons', () => {
            assert.equal(transform('<button><button /></button>'), 'newVNode(9, "button", null, newVNode(17, "button"));')
        })

        it('Should compile a table row inside a div', () => {
            assert.equal(transform('<div><tr /></div>'), 'newVNode(9, "div", null, newVNode(17, "tr"));')
        })

        it('Should compile a table cell inside tbody', () => {
            assert.equal(transform('<tbody><td /></tbody>'), 'newVNode(9, "tbody", null, newVNode(17, "td"));')
        })

        it('Should compile a complete table', () => {
            assert.equal(transform('<table><tbody><tr><td /></tr></tbody></table>'), 'newVNode(9, "table", null, newVNode(9, "tbody", null, newVNode(9, "tr", null, newVNode(17, "td"))));')
        })
    })

    describe('TSX variants', () => {
        it('Should pass a const asserted array children prop to a component', () => {
            assert.equal(transform('<Foo a="b" children={[<span class="bar">bar</span>, "123", 456] as const} />'), 'newComponentVNode(0, Foo, { "a": "b", "children": [newVNode(3, "span", "bar", "bar"), "123", 456] });')
        })

        it('Should compile a typed function child of a lowercase consumer', () => {
            assert.equal(transform('<context.Consumer>{(v: State) => <p>{v.state}</p>}</context.Consumer>'), 'newComponentVNode(0, context.Consumer, { "children": (v) => newVNode(1, "p", null, v.state) });')
        })

        it('Should keep a key after a spread on a generic component', () => {
            assert.equal(transform('<ListItem<Item> {...{ isSelected, setSelected, ...item }} key={item.name} />'), 'normalizeProps(newComponentVNode(0, ListItem, Object.assign({}, { isSelected, setSelected, ...item }), item.name));')
        })

        it('Should compile a multiple select with a satisfies array value', () => {
            assert.equal(transform('<select multiple value={["B", "C"] satisfies string[]}><option selected value="B">B</option></select>'), 'newVNode(4104, "select", null, newVNode(3, "option", null, "B", { "selected": true, "value": "B" }), { "multiple": true, "value": ["B", "C"] });')
        })
    })
})
