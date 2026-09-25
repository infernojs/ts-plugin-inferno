import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import {diagnosticMessages, expectThrows, transform} from './helpers'

/*
 * TypeScript reports invalid JSX as diagnostics and still emits, so the plugin runs on the recovered tree.
 * diagnosticMessages() runs the plugin too, these tests pin the messages users see and that the plugin
 * does not crash on the recovered tree.
 */

// Semantic diagnostic codes of a type-checked program, for grammar errors the parser does not report
function checkerDiagnosticCodes(input: string): number[] {
    const options: ts.CompilerOptions = {jsx: ts.JsxEmit.Preserve, noLib: true, types: []}
    const host = ts.createCompilerHost(options)

    host.getSourceFile = (fileName, languageVersion) => fileName === '/file.tsx' ? ts.createSourceFile(fileName, input, languageVersion, true) : undefined
    host.fileExists = fileName => fileName === '/file.tsx'

    return ts.createProgram(['/file.tsx'], options, host).getSemanticDiagnostics().map(d => d.code)
}

describe('Parser errors', function () {
    it('Should reject adjacent root elements', function () {
        assert.deepEqual(diagnosticMessages('var x = <div>one</div><div>two</div>;'), ['JSX expressions must have one parent element.'])
    })

    it('Should reject > in JSX text', function () {
        assert.deepEqual(diagnosticMessages('<div>></div>'), ['Unexpected token. Did you mean `{\'>\'}` or `&gt;`?'])
    })

    it('Should reject } in JSX text', function () {
        assert.deepEqual(diagnosticMessages('<div>}</div>'), ['Unexpected token. Did you mean `{\'}\'}` or `&rbrace;`?'])
    })

    it('Should reject mismatched closing tags', function () {
        assert.deepEqual(diagnosticMessages('<Foo></Bar>'), ['Expected corresponding JSX closing tag for \'Foo\'.'])
    })

    it('Should reject a fragment closed by an element tag', function () {
        assert.deepEqual(diagnosticMessages('<></something>'), ['Expected corresponding closing tag for JSX fragment.', 'Expression expected.'])
    })

    it('Should reject a namespace inside a member expression', function () {
        assert.deepEqual(diagnosticMessages('<a.b:c />'), ['Identifier expected.'])
    })

    // The TypeScript parser accepts it, the type checker reports TS18007
    it('Should reject an unparenthesized sequence expression', function () {
        assert.deepEqual(diagnosticMessages('<div a={b, c} />'), [])
        assert.ok(checkerDiagnosticCodes('<div a={b, c} />').includes(18007))
    })

    it('Should keep an unparenthesized sequence expression as one attribute value', function () {
        assert.equal(transform('<div a={b, c} />'), 'createVNode(1, "div", null, null, 1, { "a": (b, c) });')
    })

    it('Should reject an unquoted call as attribute value', function () {
        assert.equal(diagnosticMessages('<Foo bar=bar() />')[0], '\'{\' or JSX element expected.')
    })

    it('Should reject unterminated JSX contents', function () {
        assert.deepEqual(diagnosticMessages('<foo>yes'), ['JSX element \'foo\' has no corresponding closing tag.', '\'</\' expected.'])
    })

    it('Should reject attributes on a short syntax fragment', function () {
        assert.deepEqual(diagnosticMessages('< key="nope"></>'), ['\'(\' expected.', 'Expression expected.', 'Expression expected.'])
    })
})

describe('Plugin errors', function () {
    it('Should reject the deprecated noNormalize prop', function () {
        expectThrows(() => transform('<div noNormalize />'), 'Inferno JSX plugin:\nnoNormalize is deprecated use: $HasVNodeChildren, or if children shape is dynamic you can use: $ChildFlag={expression} see inferno package:inferno-vnode-flags (ChildFlags) for possible values')
    })

    it('Should reject the deprecated $NoNormalize prop', function () {
        expectThrows(() => transform('<div $NoNormalize />'), 'Inferno JSX plugin:\n$NoNormalize is deprecated use: $HasVNodeChildren')
    })

    it('Should reject the deprecated hasKeyedChildren prop', function () {
        expectThrows(() => transform('<div hasKeyedChildren />'), 'Inferno JSX plugin:\nhasKeyedChildren is deprecated use: $HasKeyedChildren')
    })

    it('Should reject the deprecated hasNonKeyedChildren prop', function () {
        expectThrows(() => transform('<div hasNonKeyedChildren />'), 'Inferno JSX plugin:\nhasNonKeyedChildren is deprecated use: $HasNonKeyedChildren')
    })
})
