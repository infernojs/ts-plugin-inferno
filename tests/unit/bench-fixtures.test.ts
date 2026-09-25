// Keeps the benchmark corpus compiling; a fixture that throws would silently drop out of the measurements.
// Cases from swc-plugin-inferno tests/babel_plugin_inferno/bench_fixtures.rs and babel-plugin-inferno's
// tests/bench-fixtures.test.js, over the fixtures and generated modules of bench/.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import {expectValidJS, transpile} from './helpers'

const cases = require('../../bench/cases')

// The medium and large generated cases only repeat what these cover, at a size that would slow the suite down
const SKIPPED = ['mixed-M', 'mixed-L']

function countJsxNodes(code: string): number {
    let count = 0

    function visit(node: ts.Node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
            count++
        }
        ts.forEachChild(node, visit)
    }
    visit(ts.createSourceFile('output.jsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX))
    return count
}

describe('Benchmark fixtures', () => {
    for (const name of cases.names().filter((name: string) => !SKIPPED.includes(name))) {
        it(`Should compile ${name} without JSX left over`, () => {
            const fixture = cases.load(name)
            const result = transpile(fixture.source, undefined, fixture.filename)

            assert.deepEqual(result.diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')), [])
            // TypeScript parses JSX in .js files too, so the JSX nodes are counted rather than left to the parser
            assert.equal(countJsxNodes(result.code), 0)
            // Type annotations left in the output would be reported for a .js file
            expectValidJS(result.code)
        })
    }
})
