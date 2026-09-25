// Cases from swc-plugin-inferno tests/babel_plugin_inferno/options_imports.rs (babel-plugin-inferno's sourceType tests)
// that fail on the current plugin. Each test asserts the correct behaviour; move it to tests/unit/options-imports.test.ts
// once it passes.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {expectNodeCanParse, transformWith} from '../unit/helpers'

describe('Options and imports', function () {
    /*
     * A file without imports and exports is a script, and TypeScript emits it as one (without moduleDetection "force").
     * Scripts cannot contain import declarations, so babel-plugin-inferno and swc-plugin-inferno require the helpers
     * there, like this plugin does for CommonJS output. With ES module output this plugin adds an import instead, which
     * turns the emitted script into a module: its top-level declarations are no longer globals, and a classic <script>
     * fails to parse it.
     */
    describe('script files', function () {
        // Currently adds import { createVNode } from "inferno"
        it('Should require helpers in a file parsed as script by sourceType unambiguous', function () {
            const code = transformWith('const a = require("x");\nconst b = <div/>;')

            assert.equal(code, 'var $inferno = require("inferno");\nvar createVNode = $inferno.createVNode;\nconst a = require("x");\nconst b = createVNode(1, "div");')
            expectNodeCanParse(code, 'commonjs')
        })

        // Currently adds import { createFragment, createVNode, createComponentVNode, createTextVNode, normalizeProps } from "inferno"
        it('Should require every used helper in a script', function () {
            const code = transformWith('const a = <div><Foo {...p}/>text<></></div>;')

            assert.equal(code, 'var $inferno = require("inferno");\nvar normalizeProps = $inferno.normalizeProps;\nvar createTextVNode = $inferno.createTextVNode;\nvar createComponentVNode = $inferno.createComponentVNode;\nvar createVNode = $inferno.createVNode;\nvar createFragment = $inferno.createFragment;\nconst a = createVNode(1, "div", null, [normalizeProps(createComponentVNode(2, Foo, Object.assign({}, p))), createTextVNode("text"), createFragment()], 4);')
            expectNodeCanParse(code, 'commonjs')
        })

        // Currently adds import { createComponentVNode } from "inferno"
        it('Should not require helpers that are already declared in a script', function () {
            assert.equal(transformWith('function createVNode() {}\nconst a = <div><Foo/></div>;'), 'var $inferno = require("inferno");\nvar createComponentVNode = $inferno.createComponentVNode;\nfunction createVNode() { }\nconst a = createVNode(1, "div", null, createComponentVNode(2, Foo), 2);')
        })
    })
})
