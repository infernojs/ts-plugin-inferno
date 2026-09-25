import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {diagnosticMessages, transform, transformWith} from './helpers'

// TypeScript strips the type syntax before the plugin runs as an `after` transformer
describe('TSX with the TypeScript compiler', function () {
    describe('type syntax', function () {
        it('Should drop type arguments of components', function () {
            assert.equal(transform('<Foo<string> bar={x as any} baz={y!} />'), 'createComponentVNode(2, Foo, { "bar": x, "baz": y });')
        })

        it('Should drop type arguments of components with children', function () {
            assert.equal(transform('<C<number>></C>;\n<C<number>/>;'), 'createComponentVNode(2, C);\ncreateComponentVNode(2, C);')
        })

        it('Should drop type arguments of components with text children', function () {
            assert.equal(transform('<Foo<string>>text</Foo>'), 'createComponentVNode(2, Foo, { "children": "text" });')
        })

        it('Should drop type arguments of member expression components', function () {
            assert.equal(transform('<Foo.Bar<string> />'), 'createComponentVNode(2, Foo.Bar);')
        })

        // TypeScript scans << as a shift operator, so the type argument needs a space after <
        it('Should drop function type arguments', function () {
            assert.equal(transform('<Component< <T>(v: T) => void> />'), 'createComponentVNode(2, Component);')
            assert.deepEqual(diagnosticMessages('<Component< <T>(v: T) => void> />'), [])
        })

        it('Should strip as expressions in ref and children', function () {
            assert.equal(transform('<div ref={r as any}>{(v as number)}</div>'), 'createVNode(1, "div", null, v, 0, null, null, r);')
        })

        it('Should strip as and non-null expressions in children', function () {
            assert.equal(transform('<div>{(v as number)}{w!}</div>'), 'createVNode(1, "div", null, [v, w], 0);')
        })

        it('Should keep parentheses around JSX cast in children', function () {
            assert.equal(transform('<div>{(<span/>) as unknown as string}</div>'), 'createVNode(1, "div", null, (createVNode(1, "span")), 0);')
        })

        it('Should strip non-null assertions inside optional chains', function () {
            assert.equal(transform('<div>{x?.y!.z}</div>'), 'createVNode(1, "div", null, x?.y.z, 0);')
        })

        it('Should strip as expressions in spreads', function () {
            assert.equal(transform('<Foo {...(p as Props)} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p)));')
        })

        it('Should strip non-null assertions in spreads', function () {
            assert.equal(transform('<Foo {...p!} />'), 'normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p)));')
        })

        it('Should strip parameter types of event handlers', function () {
            assert.equal(transform('<div onClick={(e: MouseEvent) => f(e)} />'), 'createVNode(1, "div", null, null, 1, { "onClick": (e) => f(e) });')
        })

        it('Should strip this parameters of event handlers', function () {
            assert.equal(transform('<div onClick={function (this: Window, e: Event) {}} />'), 'createVNode(1, "div", null, null, 1, { "onClick": function (e) { } });')
        })

        it('Should strip satisfies in keys', function () {
            assert.equal(transform('<div key={k satisfies string} />'), 'createVNode(1, "div", null, null, 1, null, k);')
        })

        it('Should compile JSX in a generic arrow function', function () {
            assert.equal(transform('export const f = <T,>(x: T) => <div>{x as any}</div>;'), 'export const f = (x) => createVNode(1, "div", null, x, 0);')
        })

        it('Should compile generic arrow functions in children and props', function () {
            assert.equal(transform('<div>{<T,>(x: T) => x}</div>'), 'createVNode(1, "div", null, (x) => x, 0);')
            assert.equal(transform('<Foo value={<T,>(x: T): T => x} />'), 'createComponentVNode(2, Foo, { "value": (x) => x });')
        })

        it('Should compile JSX next to an enum', function () {
            assert.equal(transform('enum E { A }\nexport const a = <div data-e={E.A}/>;'), 'var E;\n(function (E) {\n    E[E["A"] = 0] = "A";\n})(E || (E = {}));\nexport const a = createVNode(1, "div", null, null, 1, { "data-e": E.A });')
        })

        // transpileModule compiles each file on its own (isolatedModules), so const enums are emitted like enums
        it('Should compile JSX next to a const enum', function () {
            assert.equal(transform('const enum K { A = 1 }\nexport const a = <div tabIndex={K.A}/>;'), 'var K;\n(function (K) {\n    K[K["A"] = 1] = "A";\n})(K || (K = {}));\nexport const a = createVNode(1, "div", null, null, 1, { "tabindex": K.A });')
        })

        it('Should compile JSX inside a namespace', function () {
            assert.equal(transform('namespace N { export const el = <div/>; }'), 'var N;\n(function (N) {\n    N.el = createVNode(1, "div");\n})(N || (N = {}));')
        })

        it('Should compile JSX after a generic class', function () {
            assert.equal(transform('class C extends D<T> {}\n<C/>;'), 'class C extends D {\n}\ncreateComponentVNode(2, C);')
        })

        it('Should compile JSX next to type declarations', function () {
            assert.equal(transform('type P = {a: string};\ninterface Q {}\ndeclare const x: any;\nexport const a = <Foo<P> />;'), 'export const a = createComponentVNode(2, Foo);')
        })

        it('Should compile JSX in class fields with parameter properties and modifiers', function () {
            assert.equal(transform('abstract class X { private a = <div/>; constructor(public p: string) {} }'), 'class X {\n    p;\n    a = createVNode(1, "div");\n    constructor(p) {\n        this.p = p;\n    }\n}')
        })

        it('Should compile JSX in a decorated class', function () {
            const code = transformWith('@dec\nclass X { render() { return <div/>; } }')

            assert.match(code, /^import \{ createVNode \} from "inferno";$/m)
            assert.ok(code.endsWith('let X = class X {\n    render() { return createVNode(1, "div"); }\n};\nX = __decorate([\n    dec\n], X);'), code)
        })

        it('Should compile JSX in a decorated method', function () {
            const code = transformWith('class X { @dec m() { return <div/>; } }')

            assert.match(code, /^import \{ createVNode \} from "inferno";$/m)
            assert.ok(code.endsWith('class X {\n    m() { return createVNode(1, "div"); }\n}\n__decorate([\n    dec\n], X.prototype, "m", null);'), code)
        })
    })

    describe('import elision', function () {
        it('Should keep an import that is only used as a JSX tag', function () {
            assert.equal(transformWith('import Foo from "./Foo";\nexport const a = <Foo/>;'), 'import { createComponentVNode } from "inferno";\nimport Foo from "./Foo";\nexport const a = createComponentVNode(2, Foo);')
        })

        it('Should remove type imports and keep component imports', function () {
            assert.equal(transformWith('import { Foo } from "./Foo";\nimport type { P } from "./P";\nexport const a = <Foo<P> x={1 as number} y={z!} w={q satisfies P}/>;'), 'import { createComponentVNode } from "inferno";\nimport { Foo } from "./Foo";\nexport const a = createComponentVNode(2, Foo, { "x": 1, "y": z, "w": q });')
        })

        // TypeScript elides the unused import, the plugin adds a new one
        it('Should keep an existing createVNode import', function () {
            assert.equal(transformWith('import { createVNode } from "inferno";\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        // The TypeScript counterpart of babel's onlyRemoveTypeImports
        it('Should keep an existing createVNode import with verbatimModuleSyntax', function () {
            assert.equal(transformWith('import { createVNode } from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        // TypeScript marks the default jsxFactory (React) as used by JSX, also with jsx: preserve
        it('Should keep a React namespace import', function () {
            assert.equal(transformWith('import * as React from "react";\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\nimport * as React from "react";\nexport const a = createVNode(1, "div");')
        })

        // The TypeScript counterpart of babel's jsxPragma
        it('Should keep the jsxFactory import', function () {
            assert.equal(transformWith('import { h } from "preact";\nexport const a = <div/>;', {jsxFactory: 'h'}), 'import { createVNode } from "inferno";\nimport { h } from "preact";\nexport const a = createVNode(1, "div");')
        })

        it('Should keep the jsxFragmentFactory import', function () {
            assert.equal(transformWith('import { h, Fragment } from "preact";\nexport const a = <><div/></>;', {jsxFactory: 'h', jsxFragmentFactory: 'Fragment'}), 'import { createFragment, createVNode } from "inferno";\nimport { h, Fragment } from "preact";\nexport const a = createFragment([createVNode(1, "div")], 4);')
        })

        it('Should elide an unused import of another JSX factory', function () {
            assert.equal(transformWith('import { h } from "preact";\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })
    })
})
