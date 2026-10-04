import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {diagnosticMessages, transform, transformWith} from './helpers'

// TypeScript strips the type syntax before the plugin runs as an `after` transformer
describe('TSX with the TypeScript compiler', function () {
    describe('type syntax', function () {
        it('Should drop type arguments of components', function () {
            assert.equal(transform('<Foo<string> bar={x as any} baz={y!} />'), 'newComponentVNode(0, Foo, { "bar": x, "baz": y });')
        })

        it('Should drop type arguments of components with children', function () {
            assert.equal(transform('<C<number>></C>;\n<C<number>/>;'), 'newComponentVNode(0, C);\nnewComponentVNode(0, C);')
        })

        it('Should drop type arguments of components with text children', function () {
            assert.equal(transform('<Foo<string>>text</Foo>'), 'newComponentVNode(0, Foo, { "children": "text" });')
        })

        it('Should drop type arguments of member expression components', function () {
            assert.equal(transform('<Foo.Bar<string> />'), 'newComponentVNode(0, Foo.Bar);')
        })

        // TypeScript scans << as a shift operator, so the type argument needs a space after <
        it('Should drop function type arguments', function () {
            assert.equal(transform('<Component< <T>(v: T) => void> />'), 'newComponentVNode(0, Component);')
            assert.deepEqual(diagnosticMessages('<Component< <T>(v: T) => void> />'), [])
        })

        it('Should strip as expressions in ref and children', function () {
            assert.equal(transform('<div ref={r as any}>{(v as number)}</div>'), 'newVNode(1, "div", null, v, null, null, r);')
        })

        it('Should strip as and non-null expressions in children', function () {
            assert.equal(transform('<div>{(v as number)}{w!}</div>'), 'newVNode(1, "div", null, [v, w]);')
        })

        it('Should keep parentheses around JSX cast in children', function () {
            assert.equal(transform('<div>{(<span/>) as unknown as string}</div>'), 'newVNode(1, "div", null, (newVNode(17, "span")));')
        })

        it('Should strip non-null assertions inside optional chains', function () {
            assert.equal(transform('<div>{x?.y!.z}</div>'), 'newVNode(1, "div", null, x?.y.z);')
        })

        it('Should strip as expressions in spreads', function () {
            assert.equal(transform('<Foo {...(p as Props)} />'), 'normalizeProps(newComponentVNode(0, Foo, Object.assign({}, p)));')
        })

        it('Should strip non-null assertions in spreads', function () {
            assert.equal(transform('<Foo {...p!} />'), 'normalizeProps(newComponentVNode(0, Foo, Object.assign({}, p)));')
        })

        it('Should strip parameter types of event handlers', function () {
            assert.equal(transform('<div onClick={(e: MouseEvent) => f(e)} />'), 'newVNode(17, "div", null, null, { "onClick": (e) => f(e) });')
        })

        it('Should strip this parameters of event handlers', function () {
            assert.equal(transform('<div onClick={function (this: Window, e: Event) {}} />'), 'newVNode(17, "div", null, null, { "onClick": function (e) { } });')
        })

        it('Should strip satisfies in keys', function () {
            assert.equal(transform('<div key={k satisfies string} />'), 'newVNode(17, "div", null, null, null, k);')
        })

        it('Should compile JSX in a generic arrow function', function () {
            assert.equal(transform('export const f = <T,>(x: T) => <div>{x as any}</div>;'), 'export const f = (x) => newVNode(1, "div", null, x);')
        })

        it('Should compile generic arrow functions in children and props', function () {
            assert.equal(transform('<div>{<T,>(x: T) => x}</div>'), 'newVNode(1, "div", null, (x) => x);')
            assert.equal(transform('<Foo value={<T,>(x: T): T => x} />'), 'newComponentVNode(0, Foo, { "value": (x) => x });')
        })

        it('Should compile JSX next to an enum', function () {
            assert.equal(transform('enum E { A }\nexport const a = <div data-e={E.A}/>;'), 'var E;\n(function (E) {\n    E[E["A"] = 0] = "A";\n})(E || (E = {}));\nexport const a = newVNode(17, "div", null, null, { "data-e": E.A });')
        })

        // transpileModule compiles each file on its own (isolatedModules), so const enums are emitted like enums
        it('Should compile JSX next to a const enum', function () {
            assert.equal(transform('const enum K { A = 1 }\nexport const a = <div tabIndex={K.A}/>;'), 'var K;\n(function (K) {\n    K[K["A"] = 1] = "A";\n})(K || (K = {}));\nexport const a = newVNode(17, "div", null, null, { "tabindex": K.A });')
        })

        it('Should compile JSX inside a namespace', function () {
            assert.equal(transform('namespace N { export const el = <div/>; }'), 'var N;\n(function (N) {\n    N.el = newVNode(17, "div");\n})(N || (N = {}));')
        })

        it('Should compile JSX after a generic class', function () {
            assert.equal(transform('class C extends D<T> {}\n<C/>;'), 'class C extends D {\n}\nnewComponentVNode(0, C);')
        })

        it('Should compile JSX next to type declarations', function () {
            assert.equal(transform('type P = {a: string};\ninterface Q {}\ndeclare const x: any;\nexport const a = <Foo<P> />;'), 'export const a = newComponentVNode(0, Foo);')
        })

        it('Should compile JSX in class fields with parameter properties and modifiers', function () {
            assert.equal(transform('abstract class X { private a = <div/>; constructor(public p: string) {} }'), 'class X {\n    p;\n    a = newVNode(17, "div");\n    constructor(p) {\n        this.p = p;\n    }\n}')
        })

        it('Should compile JSX in a decorated class', function () {
            const code = transformWith('@dec\nclass X { render() { return <div/>; } }')

            assert.match(code, /^import \{ newVNode \} from "inferno";$/m)
            assert.ok(code.endsWith('let X = class X {\n    render() { return newVNode(17, "div"); }\n};\nX = __decorate([\n    dec\n], X);'), code)
        })

        it('Should compile JSX in a decorated method', function () {
            const code = transformWith('class X { @dec m() { return <div/>; } }')

            assert.match(code, /^import \{ newVNode \} from "inferno";$/m)
            assert.ok(code.endsWith('class X {\n    m() { return newVNode(17, "div"); }\n}\n__decorate([\n    dec\n], X.prototype, "m", null);'), code)
        })
    })

    describe('import elision', function () {
        it('Should keep an import that is only used as a JSX tag', function () {
            assert.equal(transformWith('import Foo from "./Foo";\nexport const a = <Foo/>;'), 'import { newComponentVNode } from "inferno";\nimport Foo from "./Foo";\nexport const a = newComponentVNode(0, Foo);')
        })

        it('Should remove type imports and keep component imports', function () {
            assert.equal(transformWith('import { Foo } from "./Foo";\nimport type { P } from "./P";\nexport const a = <Foo<P> x={1 as number} y={z!} w={q satisfies P}/>;'), 'import { newComponentVNode } from "inferno";\nimport { Foo } from "./Foo";\nexport const a = newComponentVNode(0, Foo, { "x": 1, "y": z, "w": q });')
        })

        // TypeScript elides the unused import, the plugin adds a new one
        it('Should keep an existing newVNode import', function () {
            assert.equal(transformWith('import { newVNode } from "inferno";\nexport const a = <div/>;'), 'import { newVNode } from "inferno";\nexport const a = newVNode(17, "div");')
        })

        // The TypeScript counterpart of babel's onlyRemoveTypeImports
        it('Should keep an existing newVNode import with verbatimModuleSyntax', function () {
            assert.equal(transformWith('import { newVNode } from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true}), 'import { newVNode } from "inferno";\nexport const a = newVNode(17, "div");')
        })

        // TypeScript marks the default jsxFactory (React) as used by JSX, also with jsx: preserve
        it('Should keep a React namespace import', function () {
            assert.equal(transformWith('import * as React from "react";\nexport const a = <div/>;'), 'import { newVNode } from "inferno";\nimport * as React from "react";\nexport const a = newVNode(17, "div");')
        })

        // The TypeScript counterpart of babel's jsxPragma
        it('Should keep the jsxFactory import', function () {
            assert.equal(transformWith('import { h } from "preact";\nexport const a = <div/>;', {jsxFactory: 'h'}), 'import { newVNode } from "inferno";\nimport { h } from "preact";\nexport const a = newVNode(17, "div");')
        })

        it('Should keep the jsxFragmentFactory import', function () {
            assert.equal(transformWith('import { h, Fragment } from "preact";\nexport const a = <><div/></>;', {jsxFactory: 'h', jsxFragmentFactory: 'Fragment'}), 'import { newVNode, newFragment } from "inferno";\nimport { h, Fragment } from "preact";\nexport const a = newFragment(260, [newVNode(17, "div")]);')
        })

        it('Should elide an unused import of another JSX factory', function () {
            assert.equal(transformWith('import { h } from "preact";\nexport const a = <div/>;'), 'import { newVNode } from "inferno";\nexport const a = newVNode(17, "div");')
        })

        it('Should keep an Inferno namespace import with verbatimModuleSyntax', function () {
            const code = transformWith('import * as Inferno from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true})

            assert.match(code, /^import \* as Inferno from "inferno";$/m)
            assert.match(code, /^import \{ newVNode \} from "inferno";$/m)
            assert.ok(code.endsWith('export const a = newVNode(17, "div");'), code)
        })

        it('Should keep an Inferno default import with verbatimModuleSyntax', function () {
            const code = transformWith('import Inferno from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true})

            assert.match(code, /^import Inferno(, \{ newVNode \})? from "inferno";$/m)
            assert.match(code, /\bnewVNode\b.* from "inferno";$/m)
            assert.ok(code.endsWith('export const a = newVNode(17, "div");'), code)
        })

        it('Should use newVNode imported from another module with verbatimModuleSyntax', function () {
            assert.equal(transformWith('import { newVNode } from "other-lib";\nexport const a = <div/>;', {verbatimModuleSyntax: true}), 'import { newVNode } from "other-lib";\nexport const a = newVNode(17, "div");')
        })
    })
})
