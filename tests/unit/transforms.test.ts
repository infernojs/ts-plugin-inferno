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
            assert.equal(transform('<div ref={}>{a}</div>'), 'newVNode(1, "div", null, a);')
        })
    })

    describe('Dynamic children', () => {
        it('Should not convert text to newVNode when its within Component', () => {
            assert.equal(transform('<FooBar>1</FooBar>'), 'newComponentVNode(0, FooBar, { "children": "1" });')
        })

        it('Should create textVNodes when there is single children', () => {
            assert.equal(transform('<div>foobar</div>'), 'newVNode(3, "div", null, "foobar");')
        })

        it('Should mark parent vNode with $HasKeyedChildren if even one child is keyed directly', () => {
            assert.equal(
                transform('<div><span></span><div key="1">1</div></div>'),
                'newVNode(33, "div", null, [newVNode(17, "span"), newVNode(3, "div", null, "1", null, "1")]);'
            )
        })
    })

    describe('Special flags', () => {
        it('Should be possible to define override flags runtime', () => {
            assert.equal(transform('<img $Flags={bool ? 1 : 2}>{expression}</img>'), 'newVNode(bool ? 1 : 2, "img", null, expression);')
        })

        it('Should be possible to define override flags with constant', () => {
            assert.equal(transform('<img $Flags={120}>foobar</img>'), 'newVNode(122, "img", null, "foobar");')
        })

        it('Should be possible to use expression for flags', () => {
            assert.equal(transform('<ComponentA $Flags={magic}/>'), 'newComponentVNode(magic | 16, ComponentA);')
        })
    })

    describe('onComponent hooks', () => {
        const input = '\n<Child\n    key={i}\n    onComponentDidAppear={childOnComponentDidAppear}\n    onComponentDidMount={childOnComponentDidMount}\n>\n  {i}\n</Child>\n'
        const expected = 'newComponentVNode(0, Child, { "children": i }, i, { "onComponentDidAppear": childOnComponentDidAppear, "onComponentDidMount": childOnComponentDidMount });'

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
                'newComponentVNode(0, FooBar, { "children": [normalizeProps(newComponentVNode(0, BarFoo, Object.assign({}, magics, foobars, props))), newComponentVNode(0, NoNormalize)] });'
            )
        })
    })

    describe('Basic scenarios', () => {
        it('Should transform input and htmlFor correctly', () => {
            assert.equal(
                transform('<label htmlFor={id}><input id={id} name={name} value={value} onChange={onChange} onInput={onInput} onKeyup={onKeyup} onFocus={onFocus} onClick={onClick} type="number" pattern="[0-9]+([,\\.][0-9]+)?" inputMode="numeric" min={minimum}/></label>'),
                'newVNode(9, "label", null, newVNode(528, "input", null, null, { "id": id, "name": name, "value": value, "onChange": onChange, "onInput": onInput, "onKeyup": onKeyup, "onFocus": onFocus, "onClick": onClick, "type": "number", "pattern": "[0-9]+([,\\\\.][0-9]+)?", "inputmode": "numeric", "min": minimum }), { "for": id });'
            )
        })

        it('Should transform acceptCharset correctly', () => {
            assert.equal(transform('<form acceptCharset="ISO-8859-1"/>'), 'newVNode(17, "form", null, null, { "accept-charset": "ISO-8859-1" });')
        })

        it('Should lowerCase f.e. colSpan', () => {
            assert.equal(transform('<td colSpan="5"/>'), 'newVNode(17, "td", null, null, { "colspan": "5" });')
        })
    })

    describe('SVG attributes React syntax support', () => {
        it('Should support native xlink:href', () => {
            assert.equal(transform('<svg><use xlink:href="#tester"></use></svg>'), 'newVNode(72, "svg", null, newVNode(80, "use", null, null, { "xlink:href": "#tester" }));')
        })

        it('Should transform strokeWidth to stroke-width', () => {
            assert.equal(transform('<svg><rect strokeWidth="1px"></rect></svg>'), 'newVNode(72, "svg", null, newVNode(80, "rect", null, null, { "stroke-width": "1px" }));')
        })

        // babel-plugin-inferno's tests.js names this case "Should transform strokeWidth to stroke-width" as well
        it('Should transform fillOpacity to fill-opacity', () => {
            assert.equal(transform('<svg><rect fillOpacity="1"></rect></svg>'), 'newVNode(72, "svg", null, newVNode(80, "rect", null, null, { "fill-opacity": "1" }));')
        })
    })

    describe('Fragments', () => {
        describe('Short syntax', () => {
            it('Should newFragment dynamic children', () => {
                assert.equal(transform('<>{dynamic}</>'), 'newFragment(256, dynamic);')
            })
        })
    })
})
