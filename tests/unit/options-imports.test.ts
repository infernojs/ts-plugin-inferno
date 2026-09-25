import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import transformer from '../../src'
import {emitProgram, expectNodeCanParse, transform, transformWith, commonJS, es2015, es5, es5CommonJS} from './helpers'

/*
 * The plugin has no options, the helpers are imported or required based on the module kind of the
 * TypeScript compiler options. These are the TypeScript counterparts of the babel plugin's
 * imports, pragma and sourceType tests.
 */

describe('Options and imports', function () {
    describe('module kinds', function () {
        it('Should import from inferno for ES modules', function () {
            assert.equal(transformWith('<div/>'), 'import { createVNode } from "inferno";\ncreateVNode(1, "div");')
        })

        it('Should import from inferno for ES2015 modules', function () {
            assert.equal(transformWith('<div/>', es2015), 'import { createVNode } from "inferno";\ncreateVNode(1, "div");')
        })

        it('Should import from inferno with module Preserve', function () {
            assert.equal(transformWith('export const a = <div/>;', {module: ts.ModuleKind.Preserve}), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should import from inferno for ES modules with an ES5 target', function () {
            assert.equal(transformWith('export const a = <div/>;', es5), 'import { createVNode } from "inferno";\nexport var a = createVNode(1, "div");')
        })

        it('Should import every used helper in one declaration', function () {
            assert.equal(transformWith('<div><Foo {...p}/>text<></></div>'), 'import { createFragment, createVNode, createComponentVNode, createTextVNode, normalizeProps } from "inferno";\ncreateVNode(1, "div", null, [normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p))), createTextVNode("text"), createFragment()], 4);')
        })

        it('Should require from inferno for CommonJS', function () {
            assert.equal(transformWith('<div/>', commonJS), 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\ncreateVNode(1, "div");')
        })

        it('Should require from inferno for CommonJS with an ES5 target', function () {
            assert.equal(transformWith('var a = <div/>;', es5CommonJS), 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nvar a = createVNode(1, "div");')
        })

        it('Should require every used helper for CommonJS', function () {
            assert.equal(transformWith('<div><Foo {...p}/>text<></></div>', commonJS), 'var $inferno = require("inferno");\nvar normalizeProps = $inferno.normalizeProps;\nvar createTextVNode = $inferno.createTextVNode;\nvar createComponentVNode = $inferno.createComponentVNode;\nvar createVNode = $inferno.createVNode;\nvar createFragment = $inferno.createFragment;\ncreateVNode(1, "div", null, [normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p))), createTextVNode("text"), createFragment()], 4);')
        })

        it('Should import from inferno for module Node16 in a package of type module', function () {
            const output = emitProgram({'/package.json': '{"type": "module"}', '/a.tsx': 'export const a = <div/>;'}, {module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16})

            assert.equal(output['/a.jsx'], 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");\n')
        })
    })

    describe('module formats', function () {
        it('Should require helpers in a file emitted as CommonJS by module Node16', function () {
            const output = emitProgram({'/package.json': '{}', '/a.tsx': 'export const a = <div/>;'}, {module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16})
            const code = output['/a.jsx']

            assert.ok(!code.includes('import '), code)
            assert.match(code, /require\("inferno"\)/)
            expectNodeCanParse(code, 'commonjs')
        })

        it('Should require helpers in a file emitted as CommonJS by module NodeNext', function () {
            const output = emitProgram({'/package.json': '{"type": "commonjs"}', '/a.tsx': 'export const a = <div/>;'}, {module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext})
            const code = output['/a.jsx']

            assert.ok(!code.includes('import '), code)
            assert.match(code, /require\("inferno"\)/)
            expectNodeCanParse(code, 'commonjs')
        })

        it('Should declare inferno as an AMD dependency', function () {
            assert.equal(
                transformWith('export const a = <div/>;', {module: ts.ModuleKind.AMD}),
                'define(["require", "exports", "inferno"], function (require, exports, $inferno) {\n    "use strict";\n    var createVNode = $inferno.createVNode;\n    Object.defineProperty(exports, "__esModule", { value: true });\n    exports.a = void 0;\n    exports.a = createVNode(1, "div");\n});'
            )
        })

        it('Should declare inferno as a System dependency', function () {
            const code = transformWith('export const a = <div/>;', {module: ts.ModuleKind.System})

            assert.ok(!code.includes('require('), code)
            assert.match(code, /^System\.register\(\["inferno"\], /m)
        })

        it('Should import helpers in a file emitted as an ES module by module Node16', function () {
            const output = emitProgram({'/package.json': '{"type": "module"}', '/a.tsx': 'export const a = <div/>;'}, {module: ts.ModuleKind.Node16, moduleResolution: ts.ModuleResolutionKind.Node16})

            assert.equal(output['/a.jsx'], 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");\n')
        })

        // TypeScript emits CommonJS when module is not set and the target is ES5
        it('Should require helpers when module is not set and the target is ES5', function () {
            const code = transformWith('export const a = <div/>;', {target: ts.ScriptTarget.ES5, module: undefined})

            assert.match(code, /^var \$inferno = require\("inferno"\);$/m)
            expectNodeCanParse(code, 'commonjs')
        })

        // Dependencies are passed to the factory parameters in order, side effect imports without a parameter come last
        it('Should declare inferno before the AMD dependencies without a parameter', function () {
            const code = transformWith('import "side";\nimport {x} from "other";\nexport const a = <div>{x}</div>;', {module: ts.ModuleKind.AMD})

            assert.match(code, /^define\(\["require", "exports", "other", "inferno", "side"\], function \(require, exports, other_1, \$inferno\) \{$/m)
        })

        it('Should declare inferno as a dependency of a named AMD module', function () {
            assert.match(
                transformWith('/// <amd-module name="named"/>\nexport const a = <div/>;', {module: ts.ModuleKind.AMD}),
                /^define\("named", \["require", "exports", "inferno"\], function \(require, exports, \$inferno\) \{$/m
            )
        })

        it('Should declare inferno as a UMD dependency and require it in the factory', function () {
            const code = transformWith('export const a = <div/>;', {module: ts.ModuleKind.UMD})

            assert.match(code, /^        define\(\["require", "exports", "inferno"\], factory\);$/m)
            assert.match(code, /^\}\)\(function \(require, exports\) \{\n    "use strict";\n    var \$inferno = require\("inferno"\);\n    var createVNode = \$inferno\.createVNode;$/m)
            expectNodeCanParse(code, 'commonjs')
        })

        it('Should assign the helpers in a System setter', function () {
            const code = transformWith('function createVNode() {}\nexport const a = <div><Foo/></div>;', {module: ts.ModuleKind.System})

            assert.match(code, /^System\.register\(\["inferno"\], function \(exports_1, context_1\) \{\n    "use strict";\n    var createComponentVNode;$/m)
            assert.match(code, /^            function \(\$inferno\) \{\n                createComponentVNode = \$inferno\.createComponentVNode;\n            \}$/m)
            expectNodeCanParse(code, 'commonjs')
        })
    })

    describe('helper placement for CommonJS', function () {
        it('Should require helpers before the code converted from imports', function () {
            assert.equal(transformWith('import {a} from "b";\nexport function f() { return <div><Foo/></div>; }\nexport const g = () => <span a={a}/>;', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nvar createVNode = $inferno.createVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.g = void 0;\nexports.f = f;\nconst b_1 = require("b");\nfunction f() { return createVNode(1, "div", null, createComponentVNode(2, Foo), 2); }\nconst g = () => createVNode(1, "span", null, null, 1, { "a": b_1.a });\nexports.g = g;')
        })

        it('Should require helpers after directives and before other code', function () {
            assert.equal(transformWith('"use strict";\nfoo();\nfunction f() { return <div/>; }', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nfoo();\nfunction f() { return createVNode(1, "div"); }')
        })

        it('Should require helpers after the "use strict" prologue emitted by alwaysStrict', function () {
            assert.equal(transformWith('const a = <div/>;', {...commonJS, alwaysStrict: true}), '"use strict";\nvar $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nconst a = createVNode(1, "div");')
        })

        it('Should declare helpers before a call to a hoisted function that uses JSX', function () {
            assert.equal(transformWith('render();\nfunction render() {\n  return <div/>;\n}', commonJS), 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nrender();\nfunction render() {\n    return createVNode(1, "div");\n}')
        })

        it('Should declare helpers before an existing require of inferno', function () {
            assert.equal(transformWith('var Inferno = require("inferno");\nfunction App() { return <div/>; }', commonJS), 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nvar Inferno = require("inferno");\nfunction App() { return createVNode(1, "div"); }')
        })

        it('Should declare helpers before other code when inferno is required later', function () {
            assert.equal(transformWith('foo();\nconst Inferno = require("inferno");\nexport const a = <div/>;', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.a = void 0;\nfoo();\nconst Inferno = require("inferno");\nexports.a = createVNode(1, "div");')
        })

        it('Should ignore $inferno bindings in nested scopes', function () {
            const code = transformWith('function f() { var $inferno = x; return <div/>; }', commonJS)

            assert.equal(code, 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nfunction f() { var $inferno = x; return createVNode(1, "div"); }')
            expectNodeCanParse(code, 'commonjs')
        })

        it('Should require helpers next to a converted inferno import', function () {
            assert.equal(transformWith('import {Component} from "inferno";\nexport class A extends Component { render() { return <div/>; } }', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.A = void 0;\nconst inferno_1 = require("inferno");\nclass A extends inferno_1.Component {\n    render() { return createVNode(1, "div"); }\n}\nexports.A = A;')
        })
    })

    describe('transformer reuse', function () {
        it('Should add imports in every file compiled with the same transformer', function () {
            const infernoTransformer = transformer()
            const compile = (input: string) => ts.transpileModule(input, {
                fileName: 'file.tsx',
                compilerOptions: {jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext},
                transformers: {after: [infernoTransformer]}
            }).outputText

            compile('export const a = <div/>;')
            assert.equal(compile('export const b = <span/>;'), 'import { createVNode } from "inferno";\nexport const b = createVNode(1, "span");\n')
        })

        it('Should add imports in every file of a program', function () {
            const output = emitProgram({
                '/a.tsx': 'export const a = <div/>;',
                '/b.tsx': 'export const b = <Foo/>;',
                '/c.ts': 'export const c = 1;'
            }, {module: ts.ModuleKind.ESNext})

            assert.deepEqual(output, {
                '/a.jsx': 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");\n',
                '/b.jsx': 'import { createComponentVNode } from "inferno";\nexport const b = createComponentVNode(2, Foo);\n',
                '/c.js': 'export const c = 1;\n'
            })
        })

        it('Should require helpers in every file of a CommonJS program', function () {
            const output = emitProgram({
                '/a.tsx': 'const a = <div/>;',
                '/b.tsx': 'const b = <Foo/>;'
            }, {module: ts.ModuleKind.CommonJS})

            assert.deepEqual(output, {
                '/a.jsx': '"use strict";\nvar $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nconst a = createVNode(1, "div");\n',
                '/b.jsx': '"use strict";\nvar $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nconst b = createComponentVNode(2, Foo);\n'
            })
        })
    })

    describe('existing bindings', function () {
        it('Should merge helpers into an existing inferno import', function () {
            assert.equal(transformWith('import {Component} from "inferno";\nexport class A extends Component { render() { return <div/>; } }'), 'import { Component, createVNode } from "inferno";\nexport class A extends Component {\n    render() { return createVNode(1, "div"); }\n}')
        })

        it('Should use a top-level createVNode function instead of importing', function () {
            const code = transformWith('function createVNode(){}\nexport const a = <div/>;')

            assert.equal(code, 'function createVNode() { }\nexport const a = createVNode(1, "div");')
            expectNodeCanParse(code, 'module')
        })

        it('Should use createVNode imported from another module', function () {
            const code = transformWith('import {createVNode} from "other-lib";\ncreateVNode;\nexport const a = <div/>;')

            assert.equal(code, 'import { createVNode } from "other-lib";\ncreateVNode;\nexport const a = createVNode(1, "div");')
            expectNodeCanParse(code, 'module')
        })

        it('Should not require helpers that are already declared for CommonJS', function () {
            assert.equal(transformWith('function createVNode() {}\nexport const a = <div><Foo/></div>;', commonJS), '"use strict";\nvar $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nObject.defineProperty(exports, "__esModule", { value: true });\nexports.a = void 0;\nfunction createVNode() { }\nexports.a = createVNode(1, "div", null, createComponentVNode(2, Foo), 2);')
        })

        it('Should use a unique name for the required module for CommonJS', function () {
            const code = transformWith('const $inferno = 1;\nexport const a = <div/>;', commonJS)

            expectNodeCanParse(code, 'commonjs')
            assert.match(code, /^var (\$?\w+) = require\("inferno"\);$/m)
        })

        it('Should not import helpers that are already imported', function () {
            assert.equal(transformWith('import {createVNode, createComponentVNode} from "inferno";\nexport const a = <div><Foo/></div>;'), 'import { createVNode, createComponentVNode } from "inferno";\nexport const a = createVNode(1, "div", null, createComponentVNode(2, Foo), 2);')
        })

        it('Should not import a helper twice when the code also calls it', function () {
            assert.equal(transformWith('import {createVNode} from "inferno";\nexport const a = <div/>;\nexport const b = createVNode(1, "b");'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");\nexport const b = createVNode(1, "b");')
        })

        it('Should add missing helpers to an import of other helpers', function () {
            assert.equal(transformWith('import {createFragment} from "inferno";\nexport const a = <><div/></>;\ncreateFragment;'), 'import { createFragment, createVNode } from "inferno";\nexport const a = createFragment([createVNode(1, "div")], 4);\ncreateFragment;')
        })

        it('Should still import createVNode when it is imported under another name', function () {
            assert.equal(transformWith('import {createVNode as cv} from "inferno";\ncv;\nexport const a = <div/>;'), 'import { createVNode as cv, createVNode } from "inferno";\ncv;\nexport const a = createVNode(1, "div");')
        })

        it('Should import createVNode when an unused namespace import is elided', function () {
            assert.equal(transformWith('import * as Inferno from "inferno";\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should import helpers when only types are imported from inferno', function () {
            assert.equal(transformWith('import type {VNode} from "inferno";\nexport const a: VNode = <div/>;'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
            assert.equal(transformWith('import {type VNode} from "inferno";\nexport const a: VNode = <div/>;'), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should merge helpers into an inferno import kept by verbatimModuleSyntax', function () {
            assert.equal(transformWith('import {createVNode} from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
            assert.equal(transformWith('import {} from "inferno";\nexport const a = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
            assert.equal(transformWith('import {type VNode} from "inferno";\nexport const a: VNode = <div/>;', {verbatimModuleSyntax: true}), 'import { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should not treat a re-export of inferno as an import', function () {
            assert.equal(transformWith('export * from "inferno";\nexport const a = <div/>;'), 'import { createVNode } from "inferno";\nexport * from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should ignore bindings named after other JSX runtimes', function () {
            assert.equal(transformWith('const _jsx = 1, jsx = 2;\n<div/>;'), 'import { createVNode } from "inferno";\nconst _jsx = 1, jsx = 2;\ncreateVNode(1, "div");')
        })
    })

    describe('existing inferno imports without named bindings', function () {
        it('Should import helpers next to a used namespace import', function () {
            const code = transformWith('import * as Inferno from "inferno";\nInferno.render(<div/>, root);')

            assert.match(code, /^import \* as Inferno from "inferno";$/m)
            assert.match(code, /^import \{ createVNode \} from "inferno";$/m)
            expectNodeCanParse(code, 'module')
        })

        it('Should import helpers next to a used default import', function () {
            const code = transformWith('import Inferno from "inferno";\nInferno.render(<div/>, root);')

            assert.match(code, /^import Inferno from "inferno";$/m)
            assert.match(code, /^import \{ createVNode \} from "inferno";$/m)
            expectNodeCanParse(code, 'module')
        })

        it('Should import helpers next to a default import whose named imports are elided', function () {
            const code = transformWith('import Inferno, {Component} from "inferno";\nInferno.render(<div/>, root);')

            assert.match(code, /^import Inferno(, \{ createVNode \})? from "inferno";$/m)
            assert.match(code, /\bcreateVNode\b.* from "inferno";$/m)
            expectNodeCanParse(code, 'module')
        })

        it('Should import helpers next to a side effect import', function () {
            const code = transformWith('import "inferno";\nexport const a = <div/>;')

            assert.match(code, /^import "inferno";$/m)
            assert.match(code, /^import \{ createVNode \} from "inferno";$/m)
            expectNodeCanParse(code, 'module')
        })
    })

    describe('import emission', function () {
        it('Should not import anything without JSX', function () {
            assert.equal(transformWith('const a = 1;'), 'const a = 1;')
        })

        it('Should not require anything without JSX for CommonJS', function () {
            assert.equal(transformWith('const a = 1;', commonJS), 'const a = 1;')
        })

        it('Should import once for many JSX roots', function () {
            assert.equal(transformWith('const a = <div/>;\nconst b = <span/>;'), 'import { createVNode } from "inferno";\nconst a = createVNode(1, "div");\nconst b = createVNode(1, "span");')
        })

        it('Should require once for many JSX roots for CommonJS', function () {
            assert.equal(transformWith('const a = <div/>;\nconst b = <span/>;', commonJS), 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nconst a = createVNode(1, "div");\nconst b = createVNode(1, "span");')
        })

        it('Should emit a valid ES module', function () {
            const code = transformWith('import {a} from "b";\nexport const el = <div><Foo {...p}/>text<></>{a}</div>;')

            assert.equal(code, 'import { createFragment, createVNode, createComponentVNode, createTextVNode, normalizeProps } from "inferno";\nimport { a } from "b";\nexport const el = createVNode(1, "div", null, [normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p))), createTextVNode("text"), createFragment(), a], 0);')
            expectNodeCanParse(code, 'module')
        })

        it('Should emit a valid CommonJS module', function () {
            const code = transformWith('import {a} from "b";\nexport const el = <div><Foo {...p}/>text<></>{a}</div>;', commonJS)

            expectNodeCanParse(code, 'commonjs')
            assert.ok(!code.includes('import '), code)
        })

        it('Should emit a valid CommonJS module with an ES5 target', function () {
            const code = transformWith('export const el = <div><Foo {...p}/>text<></></div>;', es5CommonJS)

            expectNodeCanParse(code, 'commonjs')
            assert.ok(!code.includes('import '), code)
        })
    })

    // JSX pragma comments are not supported; they stay in the output unchanged
    describe('directives', function () {
        it('Should import helpers after the "use strict" directive', function () {
            assert.equal(transformWith('"use strict";\nconst a = <div/>;'), '"use strict";\nimport { createVNode } from "inferno";\nconst a = createVNode(1, "div");')
        })

        it('Should import helpers after the "use client" directive', function () {
            assert.equal(transformWith('"use client";\nexport const a = <div/>;'), '"use client";\nimport { createVNode } from "inferno";\nexport const a = createVNode(1, "div");')
        })

        it('Should import helpers after the "use strict" prologue emitted by alwaysStrict', function () {
            assert.equal(transformWith('const a = <div/>;', {alwaysStrict: true}), '"use strict";\nimport { createVNode } from "inferno";\nconst a = createVNode(1, "div");')
        })
    })

    describe('pragma comments', function () {
        it('Should ignore @jsx and @jsxFrag comments', function () {
            assert.equal(transformWith('/** @jsx h */\n/** @jsxFrag F */\n<><div/></>'), 'import { createFragment, createVNode } from "inferno";\n/** @jsx h */\n/** @jsxFrag F */\ncreateFragment([createVNode(1, "div")], 4);')
        })

        it('Should ignore @jsxRuntime and @jsxImportSource comments', function () {
            assert.equal(transformWith('/** @jsxRuntime classic */\n/** @jsxImportSource preact */\n<div/>'), 'import { createVNode } from "inferno";\n/** @jsxRuntime classic */\n/** @jsxImportSource preact */\ncreateVNode(1, "div");')
        })

        it('Should ignore the jsxFactory and jsxFragmentFactory compiler options', function () {
            assert.equal(transform('<><div/></>', {jsxFactory: 'h', jsxFragmentFactory: 'Fragment'}), 'createFragment([createVNode(1, "div")], 4);')
        })
    })

    describe('current behaviour (questionable)', function () {
        // The generated call resolves to the local constant
        it('Should not detect a local binding that shadows createVNode', function () {
            assert.equal(transformWith('function f(){ const createVNode = 1; return <div/>; }'), 'import { createVNode } from "inferno";\nfunction f() { const createVNode = 1; return createVNode(1, "div"); }')
        })

        // Babel annotates generated calls with /*#__PURE__*/ for tree-shaking
        it('Should not add pure annotations to generated calls', function () {
            assert.ok(!transformWith('<div><Foo/></div>').includes('__PURE__'))
        })

        // One declaration per helper, in reverse order of POSSIBLE_IMPORTS_TO_ADD
        it('Should require helpers in one var statement each for CommonJS', function () {
            assert.equal(transformWith('<div><Foo/></div>', commonJS), 'var $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nvar createVNode = $inferno.createVNode;\ncreateVNode(1, "div", null, createComponentVNode(2, Foo), 2);')
        })
    })
})
