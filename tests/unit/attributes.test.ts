import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectValidJS, transform} from './helpers'

// Cases that fail on the current plugin are in tests/known-bugs/attributes.test.ts
describe('Attributes', () => {
    describe('verbatim attributes', () => {
        it('Should keep data- and aria- attributes', () => {
            assert.equal(transform('<div data-foo="1" aria-label="x" />'), 'createVNode(1, "div", null, null, 1, { "data-foo": "1", "aria-label": "x" });')
        })

        it('Should keep multi-hyphen data attributes', () => {
            assert.equal(transform('<div data-foo-bar={x} />'), 'createVNode(1, "div", null, null, 1, { "data-foo-bar": x });')
        })

        it('Should keep the casing of data attributes', () => {
            assert.equal(
                transform('<div data-fooBar="true" aria="hello" on="tap:x" oncustomevent={f} />'),
                'createVNode(1, "div", null, null, 1, { "data-fooBar": "true", "aria": "hello", "on": "tap:x", "oncustomevent": f });'
            )
        })

        it('Should keep namespaced attributes', () => {
            assert.equal(transform('<div xml:lang="en" />'), 'createVNode(1, "div", null, null, 1, { "xml:lang": "en" });')
        })

        it('Should keep namespaced attributes with hyphens', () => {
            assert.equal(transform('<div foo:bar-baz="1" />'), 'createVNode(1, "div", null, null, 1, { "foo:bar-baz": "1" });')
        })

        it('Should keep xmlns:xlink on svg', () => {
            assert.equal(
                transform('<svg viewBox="0 0 10 10" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path d="M0"/></g></svg>'),
                'createVNode(32, "svg", null, createVNode(32, "g", null, createVNode(32, "path", null, null, 1, { "d": "M0" }), 2), 2, { "viewBox": "0 0 10 10", "xmlns:xlink": "http://www.w3.org/1999/xlink" });'
            )
        })

        it('Should keep an uppercase CHILDREN attribute as a prop', () => {
            assert.equal(transform('<div CHILDREN="5" />'), 'createVNode(1, "div", null, null, 1, { "CHILDREN": "5" });')
        })

        it('Should keep the is attribute next to mapped attributes', () => {
            assert.equal(
                transform('<div is="custom-element" htmlFor="x" className="y" />'),
                'createVNode(1, "div", "y", null, 1, { "is": "custom-element", "for": "x" });'
            )
        })
    })

    describe('reserved words and hyphens as names', () => {
        it('Should quote reserved words and hyphenated names on components', () => {
            assert.equal(
                transform('<F aaa new const var default foo-bar/>'),
                'createComponentVNode(2, F, { "aaa": true, "new": true, "const": true, "var": true, "default": true, "foo-bar": true });'
            )
        })

        it('Should quote reserved words on elements', () => {
            assert.equal(transform('<div new const="1" />'), 'createVNode(1, "div", null, null, 1, { "new": true, "const": "1" });')
        })
    })

    describe('values', () => {
        it('Should compile valueless attributes to true', () => {
            assert.equal(
                transform('<input value={1} checked={c} defaultValue="x" defaultChecked />'),
                'createVNode(64, "input", null, null, 1, { "value": 1, "checked": c, "defaultValue": "x", "defaultChecked": true });'
            )
        })

        it('Should keep a style object', () => {
            assert.equal(transform('<div style={{color: "red"}} />'), 'createVNode(1, "div", null, null, 1, { "style": { color: "red" } });')
        })

        it('Should keep a style string', () => {
            assert.equal(transform('<div style="color: red" />'), 'createVNode(1, "div", null, null, 1, { "style": "color: red" });')
        })

        it('Should keep custom properties in a style object', () => {
            assert.equal(transform('<div style={{"--foo": 5}} />'), 'createVNode(1, "div", null, null, 1, { "style": { "--foo": 5 } });')
        })

        it('Should keep dangerouslySetInnerHTML', () => {
            assert.equal(
                transform('<div dangerouslySetInnerHTML={{__html: x}} />'),
                'createVNode(1, "div", null, null, 1, { "dangerouslySetInnerHTML": { __html: x } });'
            )
        })

        it('Should emit both dangerouslySetInnerHTML and children', () => {
            assert.equal(
                transform('<div dangerouslySetInnerHTML={{__html: "abcdef"}}>ghjkl</div>'),
                'createVNode(1, "div", null, "ghjkl", 16, { "dangerouslySetInnerHTML": { __html: "abcdef" } });'
            )
        })

        it('Should keep dangerouslySetInnerHTML on a void element', () => {
            assert.equal(
                transform('<input dangerouslySetInnerHTML={{__html: "content"}} />'),
                'createVNode(64, "input", null, null, 1, { "dangerouslySetInnerHTML": { __html: "content" } });'
            )
        })
    })

    describe('className and class', () => {
        it('Should pass an empty className', () => {
            assert.equal(transform('<div className="" />'), 'createVNode(1, "div", "");')
        })

        it('Should pass an undefined className', () => {
            assert.equal(transform('<div className={undefined} />'), 'createVNode(1, "div", undefined);')
        })

        it('Should omit a null className', () => {
            assert.equal(transform('<div className={null} />'), 'createVNode(1, "div");')
        })

        it('Should keep className and class as props on components', () => {
            assert.equal(transform('<Foo className="x" class="y" />'), 'createComponentVNode(2, Foo, { "className": "x", "class": "y" });')
        })

        it('Should use class on svg elements', () => {
            assert.equal(transform('<svg class="a"><g className="b"/></svg>'), 'createVNode(32, "svg", "a", createVNode(32, "g", "b"), 2);')
        })
    })

    describe('duplicate attributes', () => {
        // Rejecting duplicates is not implemented yet, see tests/known-bugs/attributes.test.ts

        it('Should allow htmlFor together with for on components', () => {
            assert.equal(transform('<Foo htmlFor="a" for="b" />'), 'createComponentVNode(2, Foo, { "htmlFor": "a", "for": "b" });')
        })

        it('Should allow a prop next to a spread containing the same prop', () => {
            assert.equal(
                transform('<p {...{prop}} prop />'),
                'normalizeProps(createVNode(1, "p", null, null, 1, Object.assign({}, { prop }, { "prop": true })));'
            )
        })

        it('Should drop replaced values without side effects', () => {
            assert.equal(transform('<div a children={["a", {b: 1}, () => x, -1]}>c</div>'), 'createVNode(1, "div", null, "c", 16, { "a": true });')
        })
    })

    describe('JSX as attribute values', () => {
        it('Should compile a fragment attribute value', () => {
            assert.equal(transform('<Foo value={<>{a}</>} />'), 'createComponentVNode(2, Foo, { "value": createFragment(a, 0) });')
        })

        it('Should compile JSX in a conditional attribute value', () => {
            assert.equal(
                transform('<a b={x ? <c /> : <d />} />'),
                'createVNode(1, "a", null, null, 1, { "b": x ? createVNode(1, "c") : createVNode(1, "d") });'
            )
        })

        it('Should compile render props and element props', () => {
            assert.equal(
                transform('<Foo render={() => <div>{x}</div>} icon={<Icon/>} />'),
                'createComponentVNode(2, Foo, { "render": () => createVNode(1, "div", null, x, 0), "icon": createComponentVNode(2, Icon) });'
            )
        })
    })

    describe('attribute layout', () => {
        // TypeScript keeps the original line break of the expression and drops the trailing comment inside the braces
        it('Should keep multi-line expression attributes with comments', () => {
            const code = transform('<div attr2={\n  "foo" + "bar" +\n\n  "baz" + "bug"\n  // Extra line here.\n} />')

            assert.equal(code, 'createVNode(1, "div", null, null, 1, { "attr2": "foo" + "bar" +\n        "baz" + "bug" });')
            expectValidJS(code)
        })

        it('Should allow spaces around =', () => {
            assert.equal(transform('<Trans b = "2" />'), 'createComponentVNode(2, Trans, { "b": "2" });')
        })

        it('Should allow a line break before =', () => {
            assert.equal(transform('<Foo y\n={2 } z />'), 'createComponentVNode(2, Foo, { "y": 2, "z": true });')
        })
    })

    describe('mapping tables only apply to elements', () => {
        it('Should not map htmlFor, acceptCharset or colSpan on components', () => {
            assert.equal(
                transform('<Foo htmlFor="x" acceptCharset="y" colSpan={2} />'),
                'createComponentVNode(2, Foo, { "htmlFor": "x", "acceptCharset": "y", "colSpan": 2 });'
            )
        })

        it('Should not map onDoubleClick on components', () => {
            assert.equal(transform('<Foo onDoubleClick={f} />'), 'createComponentVNode(2, Foo, { "onDoubleClick": f });')
        })
    })

    describe('mapped attributes', () => {
        it('Should map onDoubleClick and keep ondblclick', () => {
            assert.equal(transform('<div onDoubleClick={f} ondblclick={g} />'), 'createVNode(1, "div", null, null, 1, { "onDblClick": f, "ondblclick": g });')
        })

        it('Should map accentHeight on font-face', () => {
            assert.equal(transform('<font-face accentHeight={10} />'), 'createVNode(32, "font-face", null, null, 1, { "accent-height": 10 });')
        })
    })

    describe('event names', () => {
        it('Should keep capture event names', () => {
            assert.equal(
                transform('<div onClickCapture={f} onGotPointerCaptureCapture={g} onTouchMoveCapture={h} />'),
                'createVNode(1, "div", null, null, 1, { "onClickCapture": f, "onGotPointerCaptureCapture": g, "onTouchMoveCapture": h });'
            )
        })

        it('Should keep lowercase and custom event names', () => {
            assert.equal(
                transform('<div onclick={f} onanimationend={g} onOtherClick={h} />'),
                'createVNode(1, "div", null, null, 1, { "onclick": f, "onanimationend": g, "onOtherClick": h });'
            )
        })

        it('Should keep newer event names', () => {
            assert.equal(
                transform('<div onScrollEnd={a} onBeforeToggle={b} onCommand={c} onFormData={d} onAuxClick={e} />'),
                'createVNode(1, "div", null, null, 1, { "onScrollEnd": a, "onBeforeToggle": b, "onCommand": c, "onFormData": d, "onAuxClick": e });'
            )
        })

        it('Should keep onChange and onInput together', () => {
            assert.equal(transform('<input onChange={f} onInput={g} />'), 'createVNode(64, "input", null, null, 1, { "onChange": f, "onInput": g });')
        })

        it('Should keep focus events and false handlers', () => {
            assert.equal(
                transform('<div onClick={false} onFocusIn={h} onFocusOut={i} />'),
                'createVNode(1, "div", null, null, 1, { "onClick": false, "onFocusIn": h, "onFocusOut": i });'
            )
        })

        it('Should keep a string event handler on an element', () => {
            assert.equal(transform('<div onclick="a" />'), 'createVNode(1, "div", null, null, 1, { "onclick": "a" });')
        })
    })

    describe('current behaviour (questionable)', () => {
        // Babel keeps them as leading comments of the props
        it('Should drop comments between attributes', () => {
            assert.equal(
                transform('<div\n  /* a multi-line\n     comment */\n  attr1="foo">\n  <span // a double-slash comment\n    attr2="bar"\n  />\n</div>'),
                'createVNode(1, "div", null, createVNode(1, "span", null, null, 1, { "attr2": "bar" }), 2, { "attr1": "foo" });'
            )
        })
    })

    describe('TSX', () => {
        it('Should strip type assertions from attribute values', () => {
            assert.equal(
                transform('<Foo value={x as number} other={y!} third={z satisfies string} />'),
                'createComponentVNode(2, Foo, { "value": x, "other": y, "third": z });'
            )
        })

        it('Should pass a className with a type assertion', () => {
            assert.equal(transform('<div className={cls as string} style={{color: "red"} as const} />'), 'createVNode(1, "div", cls, null, 1, { "style": { color: "red" } });')
        })

        it('Should keep className, htmlFor and onDoubleClick as props on a generic component', () => {
            assert.equal(
                transform('<Foo<string> className="x" htmlFor="y" onDoubleClick={f} />'),
                'createComponentVNode(2, Foo, { "className": "x", "htmlFor": "y", "onDoubleClick": f });'
            )
        })

        it('Should compile typed render props', () => {
            assert.equal(
                transform('<Foo render={(v: number): any => <div>{v}</div>} />'),
                'createComponentVNode(2, Foo, { "render": (v) => createVNode(1, "div", null, v, 0) });'
            )
        })
    })
})
