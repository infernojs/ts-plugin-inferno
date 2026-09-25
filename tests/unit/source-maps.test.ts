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

    function compile() {
        return transpile(input, {sourceMap: true})
    }

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

    it('Should map an element call to its opening tag', function () {
        assert.deepEqual(originalPosition(compile(), 'createVNode(1, "div"'), {line: 4, column: 2})
    })

    it('Should map a component call to its opening tag', function () {
        assert.deepEqual(originalPosition(compile(), 'createComponentVNode(2'), {line: 5, column: 4})
    })

    // Babel maps to the start of the JSX text node, TypeScript skips its leading whitespace
    it('Should map a text vnode to its JSX text', function () {
        assert.deepEqual(originalPosition(compile(), 'createTextVNode('), {line: 6, column: 4})
    })

    it('Should map a fragment call to its opening tag', function () {
        assert.deepEqual(originalPosition(compile(), 'createFragment('), {line: 10, column: 2})
    })

    it('Should map normalizeProps and the call it wraps to the opening tag', function () {
        assert.deepEqual(originalPosition(compile(), 'normalizeProps('), {line: 11, column: 4})
        assert.deepEqual(originalPosition(compile(), 'createVNode(1, "b"'), {line: 11, column: 4})
    })

    it('Should map a call that replaces JSX on the same line', function () {
        const result = transpile('import {a} from "b";\nexport const el = <div>{a}</div>;', {sourceMap: true})

        assert.deepEqual(originalPosition(result, 'createVNode('), {line: 2, column: 18})
    })
})
