import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import {diagnosticMessages, es5, expectThrows, run, transform, transformWith} from './helpers'

describe('Tag names', () => {
    describe('member expressions', () => {
        it('Should compile this.foo as a component', () => {
            assert.equal(transform('<this.foo />'), 'newComponentVNode(0, this.foo);')
        })

        it('Should compile a nested this member expression with children', () => {
            assert.equal(transform('<this.foo.bar>x</this.foo.bar>'), 'newComponentVNode(0, this.foo.bar, { "children": "x" });')
        })

        it('Should compile a deep member expression', () => {
            assert.equal(transform('<a.b.c.d />'), 'newComponentVNode(0, a.b.c.d);')
        })

        it('Should compile a lowercase member expression as a component', () => {
            assert.equal(transform('<foo.bar />'), 'newComponentVNode(0, foo.bar);')
        })

        it('Should compile a lowercase context provider as a component', () => {
            assert.equal(transform('<ctx.Provider value={v}>{a}</ctx.Provider>'), 'newComponentVNode(0, ctx.Provider, { "value": v, "children": a });')
        })

        it('Should compile a this member expression ending in an uppercase name as a component', () => {
            assert.equal(transform('<this.Foo />'), 'newComponentVNode(0, this.Foo);')
        })

        it('Should compile a member expression ending in this', () => {
            assert.equal(transform('<a.this />'), 'newComponentVNode(0, a.this);')
        })

        it('Should compile a lowercase generic member expression as a component', () => {
            assert.equal(transform('<icons.close<Props> size={1} />'), 'newComponentVNode(0, icons.close, { "size": 1 });')
        })
    })

    describe('identifier tags', () => {
        it('Should compile an underscore-prefixed tag as a component', () => {
            assert.equal(transform('<_foo />'), 'newComponentVNode(0, _foo);')
        })

        it('Should compile a dollar-prefixed tag as a component', () => {
            assert.equal(transform('<$foo />'), 'newComponentVNode(0, $foo);')
        })

        it('Should compile an underscore-prefixed uppercase tag as a component', () => {
            assert.equal(transform('<_Foo />'), 'newComponentVNode(0, _Foo);')
        })

        it('Should compile __proto__ as a component', () => {
            assert.equal(transform('<__proto__ />'), 'newComponentVNode(0, __proto__);')
        })

        it('Should compile an uppercase non-ASCII tag as a component', () => {
            assert.equal(transform('<Ünicode />'), 'newComponentVNode(0, Ünicode);')
        })

        it('Should compile an all-caps tag as a component', () => {
            assert.equal(transform('<SVG />'), 'newComponentVNode(0, SVG);')
        })

        it('Should compile a capitalised tag as a component', () => {
            assert.equal(transform('<Svg />'), 'newComponentVNode(0, Svg);')
        })

        it('Should not treat a lowercase fragment tag as a Fragment', () => {
            assert.equal(transform('<fragment>a</fragment>'), 'newVNode(3, "fragment", null, "a");')
        })

        it('Should not treat a Fragment-prefixed component as a Fragment', () => {
            assert.equal(transform('<FragmentX>a</FragmentX>'), 'newComponentVNode(0, FragmentX, { "children": "a" });')
        })

        it('Should compile a variable holding a tag name as a component', () => {
            assert.equal(transform('const TagName = "div";\n<TagName />;'), 'const TagName = "div";\nnewComponentVNode(0, TagName);')
        })
    })

    describe('Object.prototype names as tags', () => {
        it('Should compile <hasOwnProperty> as an element (babel should-handle-has-own-property-correctly)', () => {
            assert.equal(transform('<hasOwnProperty>testing</hasOwnProperty>'), 'newVNode(3, "hasOwnProperty", null, "testing");')
        })

        it('Should compile <constructor> as an element', () => {
            assert.equal(transform('<constructor />'), 'newVNode(17, "constructor");')
        })

        it('Should compile <toString> as an element', () => {
            assert.equal(transform('<toString />'), 'newVNode(17, "toString");')
        })

        it('Should compile <valueOf> as an element', () => {
            assert.equal(transform('<valueOf />'), 'newVNode(17, "valueOf");')
        })
    })

    describe('type arguments', () => {
        it('Should drop the type arguments of a generic component', () => {
            assert.equal(transform('<Foo<string> />'), 'newComponentVNode(0, Foo);')
        })

        it('Should drop object type arguments and keep the props', () => {
            assert.equal(transform('<Foo<{a: number}> a={1} />'), 'newComponentVNode(0, Foo, { "a": 1 });')
        })

        it('Should drop the type arguments of a generic member expression component with children', () => {
            assert.equal(transform('<Ns.Foo<T>>x</Ns.Foo>'), 'newComponentVNode(0, Ns.Foo, { "children": "x" });')
        })
    })

    describe('namespaced tags', () => {
        // TypeScript parses namespaced tag names without a diagnostic, so the plugin has to reject them
        it('Should parse namespaced tags without TypeScript diagnostics', () => {
            const diagnostics = (input: string) => ts.transpileModule(input, {fileName: 'file.tsx', reportDiagnostics: true, compilerOptions: {jsx: ts.JsxEmit.Preserve}}).diagnostics

            assert.deepEqual(diagnostics('<svg:rect />'), [])
            assert.deepEqual(diagnostics('<f:image n:attr />'), [])
        })

        it('Should reject namespaced svg tags', () => {
            expectThrows(() => transform('<svg:rect />'), 'Namespace tags like <svg:rect> are not supported.')
        })

        it('Should reject namespaced tags with namespaced attributes', () => {
            expectThrows(() => transform('<f:image n:attr />'), 'Namespace tags like <f:image> are not supported.')
        })

        it('Should reject namespaced component tags', () => {
            expectThrows(() => transform('<Namespace:Component />'), 'Namespace tags like <Namespace:Component> are not supported.')
        })

        it('Should point the namespace tag error at the tag name', () => {
            expectThrows(() => transform('<div>\n  <svg:rect />\n</div>'), 'file.tsx(2,4)')
        })
    })

    describe('tags that are not valid identifiers', () => {
        // Babel compiles these to computed member access, TypeScript does not allow hyphens in member expression tags
        it('Should report a hyphenated member expression property as a syntax error', () => {
            assert.ok(diagnosticMessages('<Foo.bar-baz />').includes('Identifier expected.'))
        })

        it('Should report a hyphenated property in a deeper member expression as a syntax error', () => {
            assert.ok(diagnosticMessages('<Foo.bar-baz.Qux>x</Foo.bar-baz.Qux>').includes('Identifier expected.'))
        })

        it('Should report a hyphenated property of this as a syntax error', () => {
            assert.ok(diagnosticMessages('<this.foo-bar />').includes('Identifier expected.'))
        })

        it('Should compile an uppercase hyphenated tag as an element', () => {
            assert.equal(transform('<Foo-bar />'), 'newVNode(17, "Foo-bar");')
        })

        it('Should compile a mixed-case hyphenated tag with children (babel-parser basic/7)', () => {
            assert.equal(transform('<AbC-def test="x">bar</AbC-def>'), 'newVNode(3, "AbC-def", null, "bar", { "test": "x" });')
        })

        it('Should compile an underscore-prefixed hyphenated tag as an element', () => {
            assert.equal(transform('<_foo-bar />'), 'newVNode(17, "_foo-bar");')
        })

        it('Should reject a hyphenated member expression object', () => {
            expectThrows(() => transform('<a-b.c />'), 'a-b is not a valid variable name for a member expression tag.')
            expectThrows(() => transform('<a-b.c />'), 'file.tsx(1,2)')
        })
    })

    describe('custom elements', () => {
        it('Should compile a hyphenated tag as an element', () => {
            assert.equal(transform('<my-element foo="bar" />'), 'newVNode(17, "my-element", null, null, { "foo": "bar" });')
        })

        it('Should apply className and htmlFor handling to custom elements', () => {
            assert.equal(transform('<my-element className="x" htmlFor="y" />'), 'newVNode(17, "my-element", "x", null, { "for": "y" });')
        })

        it('Should compile x-component as an element', () => {
            assert.equal(transform('<x-component />'), 'newVNode(17, "x-component");')
        })

        it('Should compile a custom element with a boolean attribute', () => {
            assert.equal(transform('<o-checkbox checked />'), 'newVNode(17, "o-checkbox", null, null, { "checked": true });')
        })
    })

    describe('element flags', () => {
        it('Should flag select elements', () => {
            assert.equal(transform('<select value={v}><option>1</option></select>'), 'newVNode(4104, "select", null, newVNode(3, "option", null, "1"), { "value": v });')
        })

        it('Should flag textarea elements without children', () => {
            assert.equal(transform('<textarea value={v} />'), 'newVNode(2064, "textarea", null, null, { "value": v });')
        })

        it('Should flag input elements', () => {
            assert.equal(transform('<input disabled />'), 'newVNode(528, "input", null, null, { "disabled": true });')
        })

        it('Should flag svg children like foreignObject and keep html inside', () => {
            assert.equal(transform('<svg><foreignObject><div/></foreignObject></svg>'), 'newVNode(72, "svg", null, newVNode(72, "foreignObject", null, newVNode(17, "div")));')
        })

        it('Should flag svg text elements', () => {
            assert.equal(transform('<text x="1">hi</text>'), 'newVNode(66, "text", null, "hi", { "x": "1" });')
        })

        it('Should flag camelCase svg tags', () => {
            assert.equal(transform('<svg><linearGradient /><feGaussianBlur stdDeviation="2" /><textPath /><animateMotion /></svg>'), 'newVNode(68, "svg", null, [newVNode(80, "linearGradient"), newVNode(80, "feGaussianBlur", null, null, { "stdDeviation": "2" }), newVNode(80, "textPath"), newVNode(80, "animateMotion")]);')
        })

        it('Should compile option elements as plain html elements', () => {
            assert.equal(transform('<option>x</option>'), 'newVNode(3, "option", null, "x");')
        })
    })

    describe('this in arrow functions', () => {
        it('Should rewrite this.Foo to _this.Foo when arrow functions are compiled', () => {
            const code = transformWith('class A { m() { return () => <this.Foo/>; } }', es5)

            assert.ok(code.includes('var _this = this;'), code)
            assert.ok(code.includes('return function () { return newComponentVNode(0, _this.Foo); };'), code)
        })

        it('Should rewrite this in opening and nested member tags', () => {
            const code = transformWith('class A { m() { return () => <this.foo.bar.qux><this.foo></this.foo></this.foo.bar.qux>; } }', es5)

            assert.ok(code.includes('var _this = this;'), code)
            assert.ok(code.includes('newComponentVNode(0, _this.foo.bar.qux, {'), code)
            assert.ok(code.includes('"children": newComponentVNode(0, _this.foo)'), code)
        })

        it('Should rewrite this inside element children', () => {
            const code = transformWith('class A { m() { return () => <div>{this.x}</div>; } }', es5)

            assert.ok(code.includes('return function () { return newVNode(1, "div", null, _this.x); };'), code)
        })
    })

    describe('tag evaluation order', () => {
        it('Should read the outer component tag before evaluating its children', () => {
            assert.equal(transform('<Tag>{((Tag = Other), v)}<Tag /></Tag>'), 'newComponentVNode(0, Tag, { "children": [((Tag = Other), v), newComponentVNode(0, Tag)] });')
        })
    })

    describe('current behaviour (questionable)', () => {
        // React and Babel compile <this /> to a this reference
        it('Should compile <this /> as an element named "this"', () => {
            assert.equal(transform('() => <this />'), '() => newVNode(17, "this");')
        })

        // Babel only treats tags starting with a-z as strings, so this would be a component there
        it('Should compile a lowercase non-ASCII tag as an element', () => {
            assert.equal(transform('<é />'), 'newVNode(17, "\\u00E9");')
            assert.equal(run('<é />').type, 'é')
        })

        it('Should compile a lowercase non-ASCII word tag as an element', () => {
            assert.equal(transform('<ünicode />'), 'newVNode(17, "\\u00FCnicode");')
            assert.equal(run('<ünicode />').type, 'ünicode')
        })

        it('Should treat any member expression ending in Fragment as a Fragment', () => {
            assert.equal(transform('<x.Fragment>{a}</x.Fragment>'), 'newFragment(256, a);')
        })

        it('Should treat a deep member expression ending in Fragment as a Fragment', () => {
            assert.equal(transform('<Foo.Bar.Fragment>x</Foo.Bar.Fragment>'), 'newFragment(260, [newTextVNode("x")]);')
        })

        // image is missing from src/utils/vNodeTypes.ts; the runtime still derives the SVG namespace from the parent svg
        it('Should flag svg image as a plain html element', () => {
            assert.equal(transform('<image xlinkHref="a.png" />'), 'newVNode(17, "image", null, null, { "xlink:href": "a.png" });')
        })

        // Inferno has no MathML namespace support
        it('Should flag MathML as plain html elements', () => {
            assert.equal(transform('<math><mi>x</mi></math>'), 'newVNode(9, "math", null, newVNode(3, "mi", null, "x"));')
        })
    })
})
