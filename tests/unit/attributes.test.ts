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
            assert.equal(transform('<Foo htmlFor="a" for="b" />'), 'createComponentVNode(2, Foo, { "htmlFor": "a", "for": "b" });')
        })

        it('Should allow a prop next to a spread containing the same prop', () => {
            assert.equal(
                transform('<p {...{prop}} prop />'),
                'normalizeProps(createVNode(1, "p", null, null, 1, Object.assign({}, { prop }, { "prop": true })));'
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
            assert.equal(vNode.childFlags, 16)
        })

        it('Should evaluate a children prop replaced by several JSX children', () => {
            const f = spy()
            const vNode = run('<div children={f()}><a/><b/></div>', {f})

            assert.equal(f.calls, 1)
            assert.deepEqual(vNode.children.map(child => child.type), ['a', 'b'])
            assert.equal(vNode.childFlags, 4)
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
            assert.equal(transform('<div a children={["a", {b: 1}, () => x, -1]}>c</div>'), 'createVNode(1, "div", null, "c", 16, { "a": true });')
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
            assert.equal(vNode.childFlags, 16)
        })
    })

    describe('JSX as attribute values', () => {
        it('Should compile an element attribute value without braces on an element', () => {
            assert.equal(transform('<div attr=<span/> />'), 'createVNode(1, "div", null, null, 1, { "attr": createVNode(1, "span") });')
        })

        it('Should compile an element attribute value without braces on a component', () => {
            assert.equal(transform('<Foo attr=<span/> />'), 'createComponentVNode(2, Foo, { "attr": createVNode(1, "span") });')
        })

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
        it('Should map httpEquiv and charSet', () => {
            assert.equal(
                transform('<meta httpEquiv="refresh" charSet="utf-8" />'),
                'createVNode(1, "meta", null, null, 1, { "http-equiv": "refresh", "charset": "utf-8" });'
            )
        })

        it('Should map textAnchor on svg text', () => {
            assert.equal(
                transform('<svg><text textAnchor="middle" /></svg>'),
                'createVNode(32, "svg", null, createVNode(32, "text", null, null, 1, { "text-anchor": "middle" }), 2);'
            )
        })

        it('Should map transformOrigin', () => {
            assert.equal(transform('<div transformOrigin="0 0" />'), 'createVNode(1, "div", null, null, 1, { "transform-origin": "0 0" });')
        })

        it('Should lowercase tabIndex, readOnly and maxLength', () => {
            assert.equal(
                transform('<div tabIndex="1" readOnly maxLength={3} />'),
                'createVNode(1, "div", null, null, 1, { "tabindex": "1", "readonly": true, "maxlength": 3 });'
            )
        })

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

    describe('__proto__ prop', () => {
        it('Should emit __proto__ as a computed key on components', () => {
            assert.equal(transform('<Foo __proto__={x} />'), 'createComponentVNode(2, Foo, { ["__proto__"]: x });')
        })

        it('Should give the component an own __proto__ prop', () => {
            const x = {marker: true}
            const props = run('<Foo __proto__={x} />', {Foo: null, x}).props

            assert.equal(Object.prototype.hasOwnProperty.call(props, '__proto__'), true)
            assert.equal(Object.getPrototypeOf(props), Object.prototype)
        })

        it('Should emit __proto__ as a computed key on generic components', () => {
            assert.equal(transform('<Foo<Bar> __proto__={x} />'), 'createComponentVNode(2, Foo, { ["__proto__"]: x });')
        })

        it('Should emit __proto__ as a computed key on elements', () => {
            assert.equal(transform('<div __proto__={x} />'), 'createVNode(1, "div", null, null, 1, { ["__proto__"]: x });')
        })

        it('Should keep __proto__ next to other props (babel proto-in-jsx-attribute)', () => {
            assert.equal(transform('<p __proto__={null} class="bar" />'), 'createVNode(1, "p", "bar", null, 1, { ["__proto__"]: null });')
        })
    })

    describe('Object.prototype names as attributes', () => {
        it('Should pass constructor as a prop', () => {
            assert.equal(transform('<div constructor="foo" />'), 'createVNode(1, "div", null, null, 1, { "constructor": "foo" });')
        })

        it('Should pass toString and hasOwnProperty as props', () => {
            assert.equal(transform('<div toString="x" hasOwnProperty="y" />'), 'createVNode(1, "div", null, null, 1, { "toString": "x", "hasOwnProperty": "y" });')
        })

        it('Should pass valueOf as a prop', () => {
            assert.equal(transform('<div valueOf={v} />'), 'createVNode(1, "div", null, null, 1, { "valueOf": v });')
        })

        it('Should pass isPrototypeOf and propertyIsEnumerable as props', () => {
            assert.equal(
                transform('<div isPrototypeOf={v} propertyIsEnumerable={w} />'),
                'createVNode(1, "div", null, null, 1, { "isPrototypeOf": v, "propertyIsEnumerable": w });'
            )
        })

        it('Should pass constructor as a prop on svg elements', () => {
            assert.equal(transform('<rect constructor="x" />'), 'createVNode(32, "rect", null, null, 1, { "constructor": "x" });')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should pass true as className for a valueless className', () => {
            assert.equal(transform('<div className />'), 'createVNode(1, "div", true);')
        })

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
