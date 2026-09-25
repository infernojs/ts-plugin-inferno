import * as assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import * as ts from 'typescript'
import transformer from '../../src'

/*
 * Assertion based test helpers. The reference suite (tests/index.ts) compiles whole files and compares them
 * to tests/references*, these helpers compile small TSX snippets in memory so a test can pin one behaviour.
 */

// Same flavour of options as tests/index.ts: no "use strict" prologue, LF newlines
const baseCompilerOptions: ts.CompilerOptions = {
    jsx: ts.JsxEmit.Preserve,
    strict: false,
    // alwaysStrict=false is deprecated in TypeScript 6 and reported as a diagnostic without this
    ignoreDeprecations: '6.0',
    alwaysStrict: false,
    experimentalDecorators: true,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    newLine: ts.NewLineKind.LineFeed
}

// Compiler options that can be passed as `compilerOptions` to the transform functions
export const es5: ts.CompilerOptions = {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.ESNext}
export const es5CommonJS: ts.CompilerOptions = {target: ts.ScriptTarget.ES5, module: ts.ModuleKind.CommonJS}
export const es2015: ts.CompilerOptions = {target: ts.ScriptTarget.ES2015, module: ts.ModuleKind.ES2015}
export const commonJS: ts.CompilerOptions = {module: ts.ModuleKind.CommonJS}

export interface TranspileResult {
    code: string
    map: string | undefined
    diagnostics: readonly ts.Diagnostic[]
}

/*
 * Compiles `input` with the plugin as an `after` transformer and returns the emitted code untouched,
 * the source map when compilerOptions.sourceMap is set, and the syntactic diagnostics of the input.
 */
export function transpile(input: string, compilerOptions?: ts.CompilerOptions, fileName = 'file.tsx'): TranspileResult {
    const result = ts.transpileModule(input, {
        fileName,
        reportDiagnostics: true,
        compilerOptions: {...baseCompilerOptions, ...compilerOptions},
        transformers: {after: [transformer()]}
    })

    return {
        code: result.outputText,
        map: result.sourceMapText,
        diagnostics: result.diagnostics ?? []
    }
}

export function stripInfernoImport(code: string): string {
    return code.replace(/^import .* from "inferno";\n/m, '')
}

function stripSourceMapComment(code: string): string {
    return code.replace(/\n\/\/# sourceMappingURL=.*$/, '')
}

// Emitted code with the source map comment and the trailing newline removed, the inferno import is kept
export function transformWith(input: string, compilerOptions?: ts.CompilerOptions): string {
    return stripSourceMapComment(transpile(input, compilerOptions).code).trimEnd()
}

// Emitted code without the inferno import, so expectations can focus on the vNode calls
export function transform(input: string, compilerOptions?: ts.CompilerOptions): string {
    return stripInfernoImport(transformWith(input, compilerOptions))
}

/*
 * The plugin throws plain strings for some errors and Errors for others,
 * this matches the message of either against a substring or a RegExp.
 */
export function expectThrows(fn: () => unknown, expected: string | RegExp): void {
    let thrown: unknown
    let didThrow = false

    try {
        fn()
    } catch (error) {
        didThrow = true
        thrown = error
    }

    assert.ok(didThrow, 'Expected the transform to throw')

    const message = thrown instanceof Error ? thrown.message : String(thrown)

    if (typeof expected === 'string') {
        assert.ok(message.includes(expected), `Expected error message to include:\n${expected}\nActual message:\n${message}`)
    } else {
        assert.match(message, expected)
    }
}

// Syntactic diagnostics of the input, flattened to plain messages
export function diagnosticMessages(input: string, fileName = 'file.tsx'): string[] {
    return transpile(input, undefined, fileName).diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

// Asserts that `code` parses as JavaScript without syntax errors
export function expectValidJS(code: string, fileName = 'check.js'): void {
    const result = ts.transpileModule(code, {
        fileName,
        reportDiagnostics: true,
        compilerOptions: {allowJs: true, noEmit: false, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext}
    })
    const messages = (result.diagnostics ?? []).map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))

    assert.deepEqual(messages, [], `Expected valid JavaScript:\n${code}`)
}

// Parses `code` with Node.js, which also reports early errors like duplicate declarations that the TypeScript parser does not
export function expectNodeCanParse(code: string, inputType: 'module' | 'commonjs'): void {
    const result = spawnSync(process.execPath, ['--check', `--input-type=${inputType}`], {input: code, encoding: 'utf8'})

    assert.equal(result.status, 0, `Expected valid ${inputType} code:\n${code}\n${result.stderr}`)
}

// Emits every .ts/.tsx file of an in-memory program with the given transformer, returns the output files by name
export function emitProgram(files: Record<string, string>, compilerOptions: ts.CompilerOptions, infernoTransformer = transformer()): Record<string, string> {
    const options: ts.CompilerOptions = {jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, noLib: true, types: [], newLine: ts.NewLineKind.LineFeed, ...compilerOptions}
    const host = ts.createCompilerHost(options)
    const output: Record<string, string> = {}

    host.getSourceFile = (fileName, languageVersion) => files[fileName] === undefined ? undefined : ts.createSourceFile(fileName, files[fileName], languageVersion, true)
    host.fileExists = fileName => files[fileName] !== undefined
    host.readFile = fileName => files[fileName]
    host.directoryExists = () => true
    host.getCurrentDirectory = () => '/'
    host.writeFile = (fileName, text) => {
        output[fileName] = text
    }

    const program = ts.createProgram(Object.keys(files).filter(fileName => /\.tsx?$/.test(fileName)), options, host)

    program.emit(undefined, undefined, undefined, undefined, {after: [infernoTransformer]})

    return output
}

// TypeScript's own classic JSX emit (jsx: react) of the same input, for parity checks
export function tscReact(input: string): string {
    return ts.transpileModule(input, {
        fileName: 'file.tsx',
        compilerOptions: {...baseCompilerOptions, jsx: ts.JsxEmit.React}
    }).outputText.trim()
}

// The text children tsc's jsx: react emit passes to React.createElement, joined
export function tscText(input: string): string {
    const createElement = (_type: unknown, _props: unknown, ...children: unknown[]) => children.join('')

    return new Function('React', `return ${tscReact(input).replace(/;$/, '')}`)({createElement})
}

/*
 * Runs compiled vNode code with stub factories that return their arguments, so a test can look at the
 * values Inferno would receive, e.g. `run('<Foo a={1} />').props`. Identifiers used by the snippet are
 * passed in `scope`.
 */
export function run(input: string, scope: Record<string, unknown> = {}): any {
    const code = transform(input).replace(/;$/, '')
    const factories = {
        createVNode: (flags, type, className, children, childFlags, props, key, ref) => ({flags, type, className, children, childFlags, props, key, ref}),
        createComponentVNode: (flags, type, props, key, ref) => ({flags, type, props, key, ref}),
        createFragment: (children, childFlags, key) => ({children, childFlags, key}),
        createTextVNode: (text, key) => ({text, key}),
        normalizeProps: vNode => vNode
    }
    const names = [...Object.keys(factories), ...Object.keys(scope)]
    const values = [...Object.values(factories), ...Object.values(scope)]

    return new Function(...names, `return ${code}`)(...values)
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

// Decodes the "mappings" field of a v3 source map into [generatedColumn, source, originalLine, originalColumn] segments per line
function decodeMappings(mappings: string): number[][][] {
    const lines: number[][][] = []
    const state = [0, 0, 0, 0]

    for (const line of mappings.split(';')) {
        const segments: number[][] = []

        state[0] = 0
        for (const segment of line.split(',')) {
            if (segment === '') {
                continue
            }
            const values: number[] = []
            let value = 0
            let shift = 0

            for (const char of segment) {
                const digit = BASE64.indexOf(char)

                value += (digit & 31) << shift
                if (digit & 32) {
                    shift += 5
                } else {
                    values.push(value & 1 ? -(value >>> 1) : value >>> 1)
                    value = 0
                    shift = 0
                }
            }
            for (let i = 0; i < values.length; i++) {
                state[i] += values[i]
            }
            segments.push(state.slice(0, values.length))
        }
        lines.push(segments)
    }
    return lines
}

/*
 * Maps the first occurrence of `needle` in the generated code back to the input.
 * Returns {line, column} (line 1-based, column 0-based) or {line: null, column: null} when unmapped.
 */
export function originalPosition(result: TranspileResult, needle: string): {line: number | null, column: number | null} {
    const lines = result.code.split('\n')
    const mappings = decodeMappings(JSON.parse(result.map).mappings)

    for (let i = 0; i < lines.length; i++) {
        const column = lines[i].indexOf(needle)

        if (column !== -1) {
            // The segment covering `column` is the last one starting at or before it
            const segment = (mappings[i] ?? []).filter(s => s[0] <= column).pop()

            if (!segment || segment.length < 4) {
                return {line: null, column: null}
            }
            return {line: segment[2] + 1, column: segment[3]}
        }
    }
    throw new Error(`"${needle}" not found in generated code:\n${result.code}`)
}
