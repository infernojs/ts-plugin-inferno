import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectThrows, expectValidJS, run, transform} from './helpers'

// Returns a function that counts its calls, to check that side effects of dropped values still run
function spy(returnValue?: unknown) {
    const fn = () => {
        fn.calls++
        return returnValue
    }
    fn.calls = 0
    return fn
}

describe('Attributes', () => {
    describe('verbatim attributes', () => {
        it('Should keep data- and aria- attributes', () => {
            assert.equal(transform('<div data-foo="1" aria-label="x" />'), 'newVNode(17, "div", null, null, { "data-foo": "1", "aria-label": "x" });')
        })

        it('Should keep multi-hyphen data attributes', () => {
            assert.equal(transform('<div data-foo-bar={x} />'), 'newVNode(17, "div", null, null, { "data-foo-bar": x });')
        })

        it('Should keep the casing of data attributes', () => {
            assert.equal(
                transform('<div data-fooBar="true" aria="hello" on="tap:x" oncustomevent={f} />'),
                'newVNode(17, "div", null, null, { "data-fooBar": "true", "aria": "hello", "on": "tap:x", "oncustomevent": f });'
            )
        })

        it('Should keep namespaced attributes', () => {
            assert.equal(transform('<div xml:lang="en" />'), 'newVNode(17, "div", null, null, { "xml:lang": "en" });')
        })

        it('Should keep namespaced attributes with hyphens', () => {
            assert.equal(transform('<div foo:bar-baz="1" />'), 'newVNode(17, "div", null, null, { "foo:bar-baz": "1" });')
        })

        it('Should keep xmlns:xlink on svg', () => {
            assert.equal(
                transform('<svg viewBox="0 0 10 10" xmlns:xlink="http://www.w3.org/1999/xlink"><g><path d="M0"/></g></svg>'),
                'newVNode(72, "svg", null, newVNode(72, "g", null, newVNode(80, "path", null, null, { "d": "M0" })), { "viewBox": "0 0 10 10", "xmlns:xlink": "http://www.w3.org/1999/xlink" });'
            )
        })

        it('Should keep an uppercase CHILDREN attribute as a prop', () => {
            assert.equal(transform('<div CHILDREN="5" />'), 'newVNode(17, "div", null, null, { "CHILDREN": "5" });')
        })

        it('Should keep the is attribute next to mapped attributes', () => {
            assert.equal(
                transform('<div is="custom-element" htmlFor="x" className="y" />'),
                'newVNode(17, "div", "y", null, { "is": "custom-element", "for": "x" });'
            )
        })
    })

    describe('reserved words and hyphens as names', () => {
        it('Should quote reserved words and hyphenated names on components', () => {
            assert.equal(
                transform('<F aaa new const var default foo-bar/>'),
                'newComponentVNode(0, F, { "aaa": true, "new": true, "const": true, "var": true, "default": true, "foo-bar": true });'
            )
        })

        it('Should quote reserved words on elements', () => {
            assert.equal(transform('<div new const="1" />'), 'newVNode(17, "div", null, null, { "new": true, "const": "1" });')
        })
    })

    describe('values', () => {
        it('Should compile valueless attributes to true', () => {
            assert.equal(
                transform('<input value={1} checked={c} defaultValue="x" defaultChecked />'),
                'newVNode(528, "input", null, null, { "value": 1, "checked": c, "defaultValue": "x", "defaultChecked": true });'
            )
        })

        it('Should keep a style object', () => {
            assert.equal(transform('<div style={{color: "red"}} />'), 'newVNode(17, "div", null, null, { "style": { color: "red" } });')
        })

        it('Should keep a style string', () => {
            assert.equal(transform('<div style="color: red" />'), 'newVNode(17, "div", null, null, { "style": "color: red" });')
        })

        it('Should keep custom properties in a style object', () => {
            assert.equal(transform('<div style={{"--foo": 5}} />'), 'newVNode(17, "div", null, null, { "style": { "--foo": 5 } });')
        })

        it('Should keep dangerouslySetInnerHTML', () => {
            assert.equal(
                transform('<div dangerouslySetInnerHTML={{__html: x}} />'),
                'newVNode(17, "div", null, null, { "dangerouslySetInnerHTML": { __html: x } });'
            )
        })

        it('Should emit both dangerouslySetInnerHTML and children', () => {
            assert.equal(
                transform('<div dangerouslySetInnerHTML={{__html: "abcdef"}}>ghjkl</div>'),
                'newVNode(3, "div", null, "ghjkl", { "dangerouslySetInnerHTML": { __html: "abcdef" } });'
            )
        })

        it('Should keep dangerouslySetInnerHTML on a void element', () => {
            assert.equal(
                transform('<input dangerouslySetInnerHTML={{__html: "content"}} />'),
                'newVNode(528, "input", null, null, { "dangerouslySetInnerHTML": { __html: "content" } });'
            )
        })
    })

    describe('className and class', () => {
        it('Should pass an empty className', () => {
            assert.equal(transform('<div className="" />'), 'newVNode(17, "div", "");')
        })

        it('Should pass an undefined className', () => {
            assert.equal(transform('<div className={undefined} />'), 'newVNode(17, "div", undefined);')
        })

        it('Should omit a null className', () => {
            assert.equal(transform('<div className={null} />'), 'newVNode(17, "div");')
        })

        it('Should keep className and class as props on components', () => {
            assert.equal(transform('<Foo className="x" class="y" />'), 'newComponentVNode(0, Foo, { "className": "x", "class": "y" });')
        })

        it('Should use class on svg elements', () => {
            assert.equal(transform('<svg class="a"><g className="b"/></svg>'), 'newVNode(72, "svg", "a", newVNode(80, "g", "b"));')
        })
    })

    describe('duplicate attributes', () => {
        it('Should reject duplicate key props', () => {
            expectThrows(() => transform('<div key="a" key={b()} />'), 'Multiple key props are not supported. Remove the duplicate key prop.')
        })

        it('Should reject duplicate props on elements', () => {
            expectThrows(() => transform('<p prop prop />'), 'Multiple prop props are not supported. Remove the duplicate prop prop.')
        })

        it('Should reject duplicate props on components', () => {
            expectThrows(() => transform('<Foo title="a" id="x" title="b" />'), 'Multiple title props are not supported. Remove the duplicate title prop.')
        })

        it('Should reject duplicate props on generic components', () => {
            expectThrows(() => transform('<Foo<string> title="a" title="b" />'), 'Multiple title props are not supported. Remove the duplicate title prop.')
        })

        it('Should reject duplicate onComponent hooks', () => {
            expectThrows(
                () => transform('<Foo onComponentDidMount={a} onComponentDidMount={b} />'),
                'Multiple onComponentDidMount props are not supported. Remove the duplicate onComponentDidMount prop.'
            )
        })

        it('Should reject duplicate special flags', () => {
            expectThrows(
                () => transform('<div $HasKeyedChildren $HasKeyedChildren>{a}</div>'),
                'Multiple $HasKeyedChildren props are not supported. Remove the duplicate $HasKeyedChildren prop.'
            )
        })

        it('Should point the duplicate prop error at the duplicate', () => {
            expectThrows(() => transform('<Foo title="a" id="x" title="b" />'), 'file.tsx(1,23)')
        })

        it('Should reject htmlFor together with for on elements', () => {
            expectThrows(() => transform('<label htmlFor="a" for="b" />'), 'htmlFor and for both set the for prop. Remove one of them.')
        })

        it('Should reject a lowercased attribute together with its camelCase name', () => {
            expectThrows(() => transform('<div tabIndex="1" tabindex="2" />'), 'tabIndex and tabindex both set the tabindex prop. Remove one of them.')
        })

        it('Should reject an svg attribute together with its camelCase name', () => {
            expectThrows(() => transform('<rect strokeWidth="1" stroke-width="2" />'), 'strokeWidth and stroke-width both set the stroke-width prop. Remove one of them.')
        })

        it('Should reject a namespaced attribute together with its camelCase name', () => {
            expectThrows(() => transform('<use xlinkHref="#a" xlink:href="#b" />'), 'xlinkHref and xlink:href both set the xlink:href prop. Remove one of them.')
        })

        it('Should point the mapped attribute error at the second attribute', () => {
            expectThrows(() => transform('<label\n  htmlFor="a"\n  for="b"\n/>'), 'file.tsx(3,3)')
        })

        it('Should allow htmlFor together with for on components', () => {
            assert.equal(transform('<Foo htmlFor="a" for="b" />'), 'newComponentVNode(0, Foo, { "htmlFor": "a", "for": "b" });')
        })

        it('Should allow a prop next to a spread containing the same prop', () => {
            assert.equal(
                transform('<p {...{prop}} prop />'),
                'normalizeProps(newVNode(17, "p", null, null, Object.assign({}, { prop }, { "prop": true })));'
            )
        })

        it('Should evaluate a component children prop replaced by JSX children', () => {
            const f = spy()
            const vNode = run('<Foo children={f()}>2</Foo>', {Foo: 'Foo', f})

            assert.equal(f.calls, 1)
            assert.deepEqual(vNode.props, {children: '2'})
        })

        it('Should evaluate an element children prop replaced by JSX children', () => {
            const f = spy()
            const vNode = run('<div children={f()}>x</div>', {f})

            assert.equal(f.calls, 1)
            assert.equal(vNode.children, 'x')
            // HtmlElement and HasTextChildren
            assert.equal(vNode.flags, 3)
        })

        it('Should evaluate a children prop replaced by several JSX children', () => {
            const f = spy()
            const vNode = run('<div children={f()}><a/><b/></div>', {f})

            assert.equal(f.calls, 1)
            assert.deepEqual(vNode.children.map(child => child.type), ['a', 'b'])
            // HtmlElement and HasNonKeyedChildren
            assert.equal(vNode.flags, 5)
        })

        it('Should reject duplicate children props on components', () => {
            expectThrows(() => transform('<Foo children={1} children={4}>2</Foo>'), 'Multiple children props are not supported. Remove the duplicate children prop.')
        })

        it('Should reject duplicate children props on elements', () => {
            expectThrows(() => transform('<div children={a()} children={b()} />'), 'Multiple children props are not supported. Remove the duplicate children prop.')
        })

        it('Should point the duplicate children prop error at the duplicate', () => {
            expectThrows(() => transform('<div\n  id="x"\n  children={a()}\n  children={b()}\n/>'), 'file.tsx(4,3)')
        })

        it('Should reject duplicate ref props on elements', () => {
            expectThrows(() => transform('<div ref={a} ref={b} />'), 'Multiple ref props are not supported. Remove the duplicate ref prop.')
        })

        it('Should reject duplicate ref props on components', () => {
            expectThrows(() => transform('<Foo ref={a} onComponentDidMount={m} ref={b} />'), 'Multiple ref props are not supported. Remove the duplicate ref prop.')
        })

        it('Should point the duplicate ref prop error at the duplicate', () => {
            expectThrows(() => transform('<div ref={a} ref={b} />'), 'file.tsx(1,14)')
        })

        it('Should reject duplicate className props on elements', () => {
            expectThrows(() => transform('<div className="a" className={b} />'), 'Multiple className props are not supported. Remove the duplicate className prop.')
        })

        it('Should reject duplicate class props on elements', () => {
            expectThrows(() => transform('<div class="a" class={b} />'), 'Multiple class props are not supported. Remove the duplicate class prop.')
        })

        it('Should reject className together with class on elements', () => {
            expectThrows(() => transform('<div className={a} class={b} />'), 'className and class both set the class name. Remove one of them.')
        })

        it('Should reject class together with className on elements', () => {
            expectThrows(() => transform('<div class="a" className="b" />'), 'className and class both set the class name. Remove one of them.')
        })

        it('Should point the className and class error at the second one', () => {
            expectThrows(() => transform('<div\n  className={a}\n  class={b}\n/>'), 'file.tsx(3,3)')
        })

        it('Should reject duplicate className props on components', () => {
            expectThrows(() => transform('<Foo className="a" className="b" />'), 'Multiple className props are not supported. Remove the duplicate className prop.')
        })

        it('Should drop replaced values without side effects', () => {
            assert.equal(transform('<div a children={["a", {b: 1}, () => x, -1]}>c</div>'), 'newVNode(3, "div", null, "c", { "a": true });')
        })

        it('Should keep replaced values that may have side effects', () => {
            let iterations = 0
            const a = {
                [Symbol.iterator]() {
                    iterations++
                    return [][Symbol.iterator]()
                }
            }
            const vNode = run('<div children={[...a]}>c</div>', {a})

            assert.equal(iterations, 1)
            assert.equal(vNode.children, 'c')
            // HtmlElement and HasTextChildren
            assert.equal(vNode.flags, 3)
        })
    })

    describe('JSX as attribute values', () => {
        it('Should compile an element attribute value without braces on an element', () => {
            assert.equal(transform('<div attr=<span/> />'), 'newVNode(17, "div", null, null, { "attr": newVNode(17, "span") });')
        })

        it('Should compile an element attribute value without braces on a component', () => {
            assert.equal(transform('<Foo attr=<span/> />'), 'newComponentVNode(0, Foo, { "attr": newVNode(17, "span") });')
        })

        it('Should compile a fragment attribute value', () => {
            assert.equal(transform('<Foo value={<>{a}</>} />'), 'newComponentVNode(0, Foo, { "value": newFragment(256, a) });')
        })

        it('Should compile JSX in a conditional attribute value', () => {
            assert.equal(
                transform('<a b={x ? <c /> : <d />} />'),
                'newVNode(17, "a", null, null, { "b": x ? newVNode(17, "c") : newVNode(17, "d") });'
            )
        })

        it('Should compile render props and element props', () => {
            assert.equal(
                transform('<Foo render={() => <div>{x}</div>} icon={<Icon/>} />'),
                'newComponentVNode(0, Foo, { "render": () => newVNode(1, "div", null, x), "icon": newComponentVNode(0, Icon) });'
            )
        })
    })

    describe('attribute layout', () => {
        // TypeScript keeps the original line break of the expression and drops the trailing comment inside the braces
        it('Should keep multi-line expression attributes with comments', () => {
            const code = transform('<div attr2={\n  "foo" + "bar" +\n\n  "baz" + "bug"\n  // Extra line here.\n} />')

            assert.equal(code, 'newVNode(17, "div", null, null, { "attr2": "foo" + "bar" +\n        "baz" + "bug" });')
            expectValidJS(code)
        })

        it('Should allow spaces around =', () => {
            assert.equal(transform('<Trans b = "2" />'), 'newComponentVNode(0, Trans, { "b": "2" });')
        })

        it('Should allow a line break before =', () => {
            assert.equal(transform('<Foo y\n={2 } z />'), 'newComponentVNode(0, Foo, { "y": 2, "z": true });')
        })
    })

    describe('mapping tables only apply to elements', () => {
        it('Should not map htmlFor, acceptCharset or colSpan on components', () => {
            assert.equal(
                transform('<Foo htmlFor="x" acceptCharset="y" colSpan={2} />'),
                'newComponentVNode(0, Foo, { "htmlFor": "x", "acceptCharset": "y", "colSpan": 2 });'
            )
        })

        it('Should not map onDoubleClick on components', () => {
            assert.equal(transform('<Foo onDoubleClick={f} />'), 'newComponentVNode(0, Foo, { "onDoubleClick": f });')
        })
    })

    describe('mapped attributes', () => {
        it('Should map httpEquiv and charSet', () => {
            assert.equal(
                transform('<meta httpEquiv="refresh" charSet="utf-8" />'),
                'newVNode(17, "meta", null, null, { "http-equiv": "refresh", "charset": "utf-8" });'
            )
        })

        it('Should map textAnchor on svg text', () => {
            assert.equal(
                transform('<svg><text textAnchor="middle" /></svg>'),
                'newVNode(72, "svg", null, newVNode(80, "text", null, null, { "text-anchor": "middle" }));'
            )
        })

        it('Should map transformOrigin', () => {
            assert.equal(transform('<div transformOrigin="0 0" />'), 'newVNode(17, "div", null, null, { "transform-origin": "0 0" });')
        })

        it('Should lowercase tabIndex, readOnly and maxLength', () => {
            assert.equal(
                transform('<div tabIndex="1" readOnly maxLength={3} />'),
                'newVNode(17, "div", null, null, { "tabindex": "1", "readonly": true, "maxlength": 3 });'
            )
        })

        it('Should map onDoubleClick and keep ondblclick', () => {
            assert.equal(transform('<div onDoubleClick={f} ondblclick={g} />'), 'newVNode(17, "div", null, null, { "onDblClick": f, "ondblclick": g });')
        })

        it('Should map accentHeight on font-face', () => {
            assert.equal(transform('<font-face accentHeight={10} />'), 'newVNode(80, "font-face", null, null, { "accent-height": 10 });')
        })
    })

    describe('event names', () => {
        it('Should keep capture event names', () => {
            assert.equal(
                transform('<div onClickCapture={f} onGotPointerCaptureCapture={g} onTouchMoveCapture={h} />'),
                'newVNode(17, "div", null, null, { "onClickCapture": f, "onGotPointerCaptureCapture": g, "onTouchMoveCapture": h });'
            )
        })

        it('Should keep lowercase and custom event names', () => {
            assert.equal(
                transform('<div onclick={f} onanimationend={g} onOtherClick={h} />'),
                'newVNode(17, "div", null, null, { "onclick": f, "onanimationend": g, "onOtherClick": h });'
            )
        })

        it('Should keep newer event names', () => {
            assert.equal(
                transform('<div onScrollEnd={a} onBeforeToggle={b} onCommand={c} onFormData={d} onAuxClick={e} />'),
                'newVNode(17, "div", null, null, { "onScrollEnd": a, "onBeforeToggle": b, "onCommand": c, "onFormData": d, "onAuxClick": e });'
            )
        })

        it('Should keep onChange and onInput together', () => {
            assert.equal(transform('<input onChange={f} onInput={g} />'), 'newVNode(528, "input", null, null, { "onChange": f, "onInput": g });')
        })

        it('Should keep focus events and false handlers', () => {
            assert.equal(
                transform('<div onClick={false} onFocusIn={h} onFocusOut={i} />'),
                'newVNode(17, "div", null, null, { "onClick": false, "onFocusIn": h, "onFocusOut": i });'
            )
        })

        it('Should keep a string event handler on an element', () => {
            assert.equal(transform('<div onclick="a" />'), 'newVNode(17, "div", null, null, { "onclick": "a" });')
        })
    })

    describe('__proto__ prop', () => {
        it('Should emit __proto__ as a computed key on components', () => {
            assert.equal(transform('<Foo __proto__={x} />'), 'newComponentVNode(0, Foo, { ["__proto__"]: x });')
        })

        it('Should give the component an own __proto__ prop', () => {
            const x = {marker: true}
            const props = run('<Foo __proto__={x} />', {Foo: null, x}).props

            assert.equal(Object.prototype.hasOwnProperty.call(props, '__proto__'), true)
            assert.equal(Object.getPrototypeOf(props), Object.prototype)
        })

        it('Should emit __proto__ as a computed key on generic components', () => {
            assert.equal(transform('<Foo<Bar> __proto__={x} />'), 'newComponentVNode(0, Foo, { ["__proto__"]: x });')
        })

        it('Should emit __proto__ as a computed key on elements', () => {
            assert.equal(transform('<div __proto__={x} />'), 'newVNode(17, "div", null, null, { ["__proto__"]: x });')
        })

        it('Should keep __proto__ next to other props (babel proto-in-jsx-attribute)', () => {
            assert.equal(transform('<p __proto__={null} class="bar" />'), 'newVNode(17, "p", "bar", null, { ["__proto__"]: null });')
        })
    })

    describe('Object.prototype names as attributes', () => {
        it('Should pass constructor as a prop', () => {
            assert.equal(transform('<div constructor="foo" />'), 'newVNode(17, "div", null, null, { "constructor": "foo" });')
        })

        it('Should pass toString and hasOwnProperty as props', () => {
            assert.equal(transform('<div toString="x" hasOwnProperty="y" />'), 'newVNode(17, "div", null, null, { "toString": "x", "hasOwnProperty": "y" });')
        })

        it('Should pass valueOf as a prop', () => {
            assert.equal(transform('<div valueOf={v} />'), 'newVNode(17, "div", null, null, { "valueOf": v });')
        })

        it('Should pass isPrototypeOf and propertyIsEnumerable as props', () => {
            assert.equal(
                transform('<div isPrototypeOf={v} propertyIsEnumerable={w} />'),
                'newVNode(17, "div", null, null, { "isPrototypeOf": v, "propertyIsEnumerable": w });'
            )
        })

        it('Should pass constructor as a prop on svg elements', () => {
            assert.equal(transform('<rect constructor="x" />'), 'newVNode(80, "rect", null, null, { "constructor": "x" });')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should pass true as className for a valueless className', () => {
            assert.equal(transform('<div className />'), 'newVNode(17, "div", true);')
        })

        // Inferno removed noNormalize long ago, so like babel-plugin-inferno the plugin treats it as any other prop
        it('Should pass the removed noNormalize and $NoNormalize props through', () => {
            assert.equal(transform('<div noNormalize />'), 'newVNode(17, "div", null, null, { "noNormalize": true });')
            assert.equal(transform('<div $NoNormalize />'), 'newVNode(17, "div", null, null, { "$NoNormalize": true });')
        })

        // Babel keeps them as leading comments of the props
        it('Should drop comments between attributes', () => {
            assert.equal(
                transform('<div\n  /* a multi-line\n     comment */\n  attr1="foo">\n  <span // a double-slash comment\n    attr2="bar"\n  />\n</div>'),
                'newVNode(9, "div", null, newVNode(17, "span", null, null, { "attr2": "bar" }), { "attr1": "foo" });'
            )
        })
    })

    describe('TSX', () => {
        it('Should strip type assertions from attribute values', () => {
            assert.equal(
                transform('<Foo value={x as number} other={y!} third={z satisfies string} />'),
                'newComponentVNode(0, Foo, { "value": x, "other": y, "third": z });'
            )
        })

        it('Should pass a className with a type assertion', () => {
            assert.equal(transform('<div className={cls as string} style={{color: "red"} as const} />'), 'newVNode(17, "div", cls, null, { "style": { color: "red" } });')
        })

        it('Should keep className, htmlFor and onDoubleClick as props on a generic component', () => {
            assert.equal(
                transform('<Foo<string> className="x" htmlFor="y" onDoubleClick={f} />'),
                'newComponentVNode(0, Foo, { "className": "x", "htmlFor": "y", "onDoubleClick": f });'
            )
        })

        it('Should compile typed render props', () => {
            assert.equal(
                transform('<Foo render={(v: number): any => <div>{v}</div>} />'),
                'newComponentVNode(0, Foo, { "render": (v) => newVNode(1, "div", null, v) });'
            )
        })
    })
})
