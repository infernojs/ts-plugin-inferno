import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {commonJS, originalPosition, transpile} from './helpers'

// Positions are {line: 1-based, column: 0-based}, like the babel plugin's source map tests
describe('Source maps', function () {
    const input = [
        'const x = 1;',
        '',
        'const el = (',
        '  <div className="a">',
        '    <Foo bar={x} />',
        '    text',
        '  </div>',
        ');',
        'const f = (',
        '  <>',
        '    <b {...p} />',
        '  </>',
        ');'
    ].join('\n')

    it('Should emit a source map for the original file', function () {
        const map = JSON.parse(transpile(input, {sourceMap: true}).map)

        assert.deepEqual(map.sources, ['file.tsx'])
    })

    it('Should keep the mappings of the code around JSX after inserting the import', function () {
        const result = transpile(input, {sourceMap: true})

        assert.deepEqual(originalPosition(result, 'const x'), {line: 1, column: 0})
        assert.deepEqual(originalPosition(result, 'const el'), {line: 3, column: 0})
        assert.deepEqual(originalPosition(result, 'const f'), {line: 9, column: 0})
    })

    it('Should keep the mappings of expressions inside JSX', function () {
        const result = transpile(input, {sourceMap: true})

        assert.deepEqual(originalPosition(result, 'Foo,'), {line: 5, column: 5})
        assert.deepEqual(originalPosition(result, 'x }'), {line: 5, column: 14})
        assert.deepEqual(originalPosition(result, 'p)'), {line: 11, column: 11})
    })

    it('Should keep the mappings of the code around JSX after requiring helpers for CommonJS', function () {
        const result = transpile(input, {...commonJS, sourceMap: true})

        assert.deepEqual(originalPosition(result, 'const x'), {line: 1, column: 0})
        assert.deepEqual(originalPosition(result, 'const f'), {line: 9, column: 0})
    })
})
