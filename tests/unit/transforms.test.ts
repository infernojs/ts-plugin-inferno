// Cases from swc-plugin-inferno tests/babel_plugin_inferno/transforms.rs, a port of babel-plugin-inferno's original
// tests.js, that the reference cases and the other unit tests do not cover yet.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import {transform} from './helpers'

// Diagnostics of a type-checked program, for grammar errors the parser does not report
function checkerDiagnosticMessages(input: string): string[] {
    const options: ts.CompilerOptions = {jsx: ts.JsxEmit.Preserve, noLib: true, types: []}
    const host = ts.createCompilerHost(options)

    host.getSourceFile = (fileName, languageVersion) => fileName === '/file.tsx' ? ts.createSourceFile(fileName, input, languageVersion, true) : undefined
    host.fileExists = fileName => fileName === '/file.tsx'

    return ts.createProgram(['/file.tsx'], options, host).getSemanticDiagnostics().map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
}

describe('Transforms', () => {
    describe('Empty attrs', () => {
        // babel-plugin-inferno and swc's parser reject {} as an attribute value, TypeScript's type checker does
        it('Should reject an empty ref', () => {
            assert.ok(checkerDiagnosticMessages('<div ref={}>{a}</div>').includes('JSX attributes must only be assigned a non-empty \'expression\'.'))
            // The plugin still compiles it, like any attribute with an empty expression the ref is null
            assert.equal(transform('<div ref={}>{a}</div>'), 'createVNode(1, "div", null, a, 0);')
        })
    })

    describe('Dynamic children', () => {
        it('Should not convert text to createVNode when its within Component', () => {
            assert.equal(transform('<FooBar>1</FooBar>'), 'createComponentVNode(2, FooBar, { "children": "1" });')
        })

        it('Should create textVNodes when there is single children', () => {
            assert.equal(transform('<div>foobar</div>'), 'createVNode(1, "div", null, "foobar", 16);')
        })

        it('Should mark parent vNode with $HasKeyedChildren if even one child is keyed directly', () => {
            assert.equal(
                transform('<div><span></span><div key="1">1</div></div>'),
                'createVNode(1, "div", null, [createVNode(1, "span"), createVNode(1, "div", null, "1", 16, null, "1")], 8);'
            )
        })
    })

    describe('Special flags', () => {
        it('Should be possible to define override flags runtime', () => {
            assert.equal(transform('<img $Flags={bool ? 1 : 2}>{expression}</img>'), 'createVNode(bool ? 1 : 2, "img", null, expression, 0);')
        })

        it('Should be possible to define override flags with constant', () => {
            assert.equal(transform('<img $Flags={120}>foobar</img>'), 'createVNode(120, "img", null, "foobar", 16);')
        })

        it('Should be possible to use expression for flags', () => {
            assert.equal(transform('<ComponentA $Flags={magic}/>'), 'createComponentVNode(magic, ComponentA);')
        })
    })

    describe('onComponent hooks', () => {
        const input = '\n<Child\n    key={i}\n    onComponentDidAppear={childOnComponentDidAppear}\n    onComponentDidMount={childOnComponentDidMount}\n>\n  {i}\n</Child>\n'
        const expected = 'createComponentVNode(2, Child, { "children": i }, i, { "onComponentDidAppear": childOnComponentDidAppear, "onComponentDidMount": childOnComponentDidMount });'

        it('Should add hooks to refs for functional components', () => {
            assert.equal(transform(input), expected)
        })

        // babel-plugin-inferno's tests.js repeats the previous case under this title
        it('Should handle hooks to refs and ref for functional components', () => {
            assert.equal(transform(input), expected)
        })
    })

    describe('spreadOperator', () => {
        it('Should do single normalization when multiple spread operators are used', () => {
            assert.equal(
                transform('<FooBar><BarFoo {...magics} {...foobars} {...props}/><NoNormalize/></FooBar>'),
                'createComponentVNode(2, FooBar, { "children": [normalizeProps(createComponentVNode(2, BarFoo, Object.assign({}, magics, foobars, props))), createComponentVNode(2, NoNormalize)] });'
            )
        })
    })

    describe('Basic scenarios', () => {
        it('Should transform input and htmlFor correctly', () => {
            assert.equal(
                transform('<label htmlFor={id}><input id={id} name={name} value={value} onChange={onChange} onInput={onInput} onKeyup={onKeyup} onFocus={onFocus} onClick={onClick} type="number" pattern="[0-9]+([,\\.][0-9]+)?" inputMode="numeric" min={minimum}/></label>'),
                'createVNode(1, "label", null, createVNode(64, "input", null, null, 1, { "id": id, "name": name, "value": value, "onChange": onChange, "onInput": onInput, "onKeyup": onKeyup, "onFocus": onFocus, "onClick": onClick, "type": "number", "pattern": "[0-9]+([,\\\\.][0-9]+)?", "inputmode": "numeric", "min": minimum }), 2, { "for": id });'
            )
        })

        it('Should transform acceptCharset correctly', () => {
            assert.equal(transform('<form acceptCharset="ISO-8859-1"/>'), 'createVNode(1, "form", null, null, 1, { "accept-charset": "ISO-8859-1" });')
        })

        it('Should lowerCase f.e. colSpan', () => {
            assert.equal(transform('<td colSpan="5"/>'), 'createVNode(1, "td", null, null, 1, { "colspan": "5" });')
        })
    })

    describe('SVG attributes React syntax support', () => {
        it('Should support native xlink:href', () => {
            assert.equal(transform('<svg><use xlink:href="#tester"></use></svg>'), 'createVNode(32, "svg", null, createVNode(32, "use", null, null, 1, { "xlink:href": "#tester" }), 2);')
        })

        it('Should transform strokeWidth to stroke-width', () => {
            assert.equal(transform('<svg><rect strokeWidth="1px"></rect></svg>'), 'createVNode(32, "svg", null, createVNode(32, "rect", null, null, 1, { "stroke-width": "1px" }), 2);')
        })

        // babel-plugin-inferno's tests.js names this case "Should transform strokeWidth to stroke-width" as well
        it('Should transform fillOpacity to fill-opacity', () => {
            assert.equal(transform('<svg><rect fillOpacity="1"></rect></svg>'), 'createVNode(32, "svg", null, createVNode(32, "rect", null, null, 1, { "fill-opacity": "1" }), 2);')
        })
    })

    describe('Fragments', () => {
        describe('Short syntax', () => {
            it('Should createFragment dynamic children', () => {
                assert.equal(transform('<>{dynamic}</>'), 'createFragment(dynamic, 0);')
            })
        })
    })
})
