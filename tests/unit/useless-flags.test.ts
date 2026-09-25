// Mirrors babel-plugin-inferno's tests/useless-flags.test.js

import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import transformer from '../../src'
import {collectWarnings, expectThrows, stripInfernoImport, transform, transformWarnings} from './helpers'

const KNOWN = ' is not needed: the children are known at compile time, so the plugin sets their child flags. Child flags only help with dynamic children such as {expression}.'
const COMPONENT = ' has no effect on components. Their children are passed in props.children.'
const FRAGMENT = ' has no effect on Fragments.'

const CHILD_FLAGS = ['$HasVNodeChildren', '$HasTextChildren', '$HasNonKeyedChildren', '$HasKeyedChildren', '$ChildFlag={1}']

function flagName(flag: string) {
    return flag.split('=')[0]
}

function warnings(input: string, pluginOptions?: Parameters<typeof transformer>[0]) {
    return transformWarnings(input, pluginOptions).warnings
}

// The message of each warning, without the prefix, the location and the code frame
function messages(input: string, pluginOptions?: Parameters<typeof transformer>[0]) {
    return warnings(input, pluginOptions).map(warning => warning.split('\n')[0].replace(/^ts-plugin-inferno: .*?\(\d+,\d+\): /, ''))
}

describe('Useless flags', () => {
    describe('children known at compile time', () => {
        it('Should warn about $HasVNodeChildren on a single static element', () => {
            const result = transformWarnings('<div $HasVNodeChildren><h1>Hi</h1></div>')

            assert.deepEqual(result.warnings, [
                'ts-plugin-inferno: file.tsx(1,6): $HasVNodeChildren' + KNOWN + '\n' +
                '> 1 | <div $HasVNodeChildren><h1>Hi</h1></div>\n' +
                '    |      ^^^^^^^^^^^^^^^^^'
            ])
            assert.equal(result.code, transformWarnings('<div $HasVNodeChildren><h1>Hi</h1></div>', {uselessFlags: 'off'}).code)
        })

        it('Should point at the flag in multi-line code', () => {
            const result = transformWarnings('function App() {\n  return (\n    <div $HasVNodeChildren>\n      <h1>Hi</h1>\n    </div>\n  );\n}\nconst a = 1;')

            assert.deepEqual(result.warnings, [
                'ts-plugin-inferno: file.tsx(3,10): $HasVNodeChildren' + KNOWN + '\n' +
                '  1 | function App() {\n' +
                '  2 |   return (\n' +
                '> 3 |     <div $HasVNodeChildren>\n' +
                '    |          ^^^^^^^^^^^^^^^^^\n' +
                '  4 |       <h1>Hi</h1>\n' +
                '  5 |     </div>\n' +
                '  6 |   );'
            ])
        })

        it('Should mark every line of a flag that spans several lines', () => {
            assert.equal(warnings('<div $ChildFlag={\n  1\n}><a/></div>')[0].split('\n').slice(1).join('\n'),
                '> 1 | <div $ChildFlag={\n' +
                '    |      ^^^^^^^^^^^^\n' +
                '> 2 |   1\n' +
                '    | ^^^\n' +
                '> 3 | }><a/></div>\n' +
                '    | ^'
            )
        })

        it('Should line up the markers with tab indentation', () => {
            assert.equal(warnings('\t<div\t$HasVNodeChildren><a/></div>')[0].split('\n').slice(1).join('\n'),
                '> 1 | \t<div\t$HasVNodeChildren><a/></div>\n' +
                '    | \t    \t^^^^^^^^^^^^^^^^^'
            )
        })

        it('Should pad the line numbers to the widest one', () => {
            const input = '\n'.repeat(8) + '<div $HasTextChildren>text</div>\n\n\n'

            assert.deepEqual(warnings(input)[0].split('\n').slice(1), [
                '   7 |',
                '   8 |',
                '>  9 | <div $HasTextChildren>text</div>',
                '     |      ^^^^^^^^^^^^^^^^',
                '  10 |',
                '  11 |',
                '  12 |'
            ])
        })

        const shapes = [
            '<div FLAG />',
            '<div FLAG>\n  </div>',
            '<div FLAG>text</div>',
            '<div FLAG><a/></div>',
            '<div FLAG><Foo/></div>',
            '<div FLAG><></></div>',
            '<div FLAG><a/><b/></div>',
            '<div FLAG><a key="1"/><b key="2"/></div>',
            '<div FLAG>text<a/></div>',
            '<input FLAG />',
            '<div FLAG children="t" />',
            '<div FLAG children />',
            '<div FLAG children={<a/>} />',
            '<div FLAG children={(<a/>)} />',
            '<div FLAG children={<a/> as any} />',
            '<div FLAG children=<a/> />',
            '<div FLAG children={<></>} />',
            '<div FLAG children={null} />',
            '<div FLAG children={a}><b/></div>',
            '<Fragment FLAG />',
            '<Fragment FLAG>text</Fragment>',
            '<Fragment FLAG><a/></Fragment>',
            '<Fragment FLAG><a/><b/></Fragment>',
            '<Fragment FLAG key="k"><a key="1"/><b key="2"/></Fragment>',
            '<Fragment FLAG children="t" />',
            '<Fragment FLAG children={null} />',
            '<Inferno.Fragment FLAG><a/></Inferno.Fragment>'
        ]

        for (const flag of CHILD_FLAGS) {
            for (const shape of shapes) {
                const input = shape.replace('FLAG', flag)

                it('Should warn about ' + JSON.stringify(input), () => {
                    assert.deepEqual(messages(input), [flagName(flag) + KNOWN])
                })
            }
        }

        it('Should warn about every child flag when there are several', () => {
            assert.deepEqual(messages('<div $HasKeyedChildren $HasNonKeyedChildren><a/></div>'), [
                '$HasKeyedChildren' + KNOWN,
                '$HasNonKeyedChildren' + KNOWN
            ])
        })

        it('Should warn with a spread attribute', () => {
            assert.deepEqual(messages('<div {...p} $HasVNodeChildren><a/></div>'), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should not warn about $Flags and $ReCreate on static children', () => {
            assert.deepEqual(warnings('<div $Flags={1}><a/></div>'), [])
            assert.deepEqual(warnings('<div $ReCreate><a/></div>'), [])
        })
    })

    describe('dynamic children', () => {
        const shapes = [
            '<div FLAG>{a}</div>',
            '<div FLAG>{...a}</div>',
            '<div FLAG>text{a}</div>',
            '<div FLAG><a/>{b}</div>',
            '<div FLAG>{<a/>}</div>',
            '<div FLAG>{"text"}</div>',
            '<div FLAG>{/* c */}<a/></div>',
            '<div FLAG children={a} />',
            '<div FLAG children={"t"} />',
            '<div FLAG children={a}>\n  </div>',
            '<div {...p} FLAG>{a}</div>',
            '<Fragment FLAG>{a}</Fragment>',
            '<Fragment FLAG children={a} />',
            '<Fragment FLAG children={<a/>} />',
            '<Fragment FLAG children=<a/> />'
        ]

        for (const flag of CHILD_FLAGS) {
            for (const shape of shapes) {
                const input = shape.replace('FLAG', flag)

                it('Should not warn about ' + JSON.stringify(input), () => {
                    assert.deepEqual(warnings(input), [])
                })
            }
        }

        it('Should not warn about a $ChildFlag expression', () => {
            assert.deepEqual(warnings('<div $ChildFlag={x}>{a}</div>'), [])
        })
    })

    describe('components', () => {
        for (const flag of CHILD_FLAGS) {
            it('Should warn about ' + flagName(flag) + ' on a component', () => {
                assert.deepEqual(messages('<Foo ' + flag + '>{a}</Foo>'), [flagName(flag) + COMPONENT])
            })
        }

        it('Should warn about a child flag on a component without children', () => {
            assert.deepEqual(messages('<Foo $HasVNodeChildren />'), ['$HasVNodeChildren' + COMPONENT])
        })

        it('Should warn about a child flag on a member expression component', () => {
            assert.deepEqual(messages('<Ns.Foo $HasTextChildren>text</Ns.Foo>'), ['$HasTextChildren' + COMPONENT])
        })

        it('Should warn about a child flag on a component with type arguments', () => {
            const result = warnings('<Foo<T> $HasKeyedChildren>{a}</Foo>')

            assert.equal(result.length, 1)
            assert.ok(result[0].startsWith('ts-plugin-inferno: file.tsx(1,9): $HasKeyedChildren' + COMPONENT + '\n'), result[0])
        })

        it('Should warn about each child flag on a component', () => {
            assert.deepEqual(messages('<Foo $HasKeyedChildren $ChildFlag={1}>{a}</Foo>'), [
                '$HasKeyedChildren' + COMPONENT,
                '$ChildFlag' + COMPONENT
            ])
        })

        it('Should compile the same without the child flag', () => {
            assert.equal(transform('<Foo $HasKeyedChildren>{a}</Foo>'), transform('<Foo>{a}</Foo>'))
        })

        it('Should not warn about $Flags or $ReCreate on a component', () => {
            assert.deepEqual(warnings('<Foo $Flags={4}/>'), [])
            assert.deepEqual(warnings('<Foo $ReCreate/>'), [])
        })
    })

    describe('conflicting flags', () => {
        const cases = [
            ['<div $HasKeyedChildren $HasNonKeyedChildren>{a}</div>', '$HasNonKeyedChildren', '$HasKeyedChildren'],
            ['<div $HasNonKeyedChildren $HasKeyedChildren>{a}</div>', '$HasNonKeyedChildren', '$HasKeyedChildren'],
            ['<div $HasTextChildren $HasVNodeChildren>{a}</div>', '$HasVNodeChildren', '$HasTextChildren'],
            ['<div $HasNonKeyedChildren $HasTextChildren>{a}</div>', '$HasTextChildren', '$HasNonKeyedChildren'],
            ['<div $ChildFlag={1} $HasKeyedChildren>{a}</div>', '$HasKeyedChildren', '$ChildFlag'],
            ['<div $HasVNodeChildren $ChildFlag={x}>{a}</div>', '$HasVNodeChildren', '$ChildFlag'],
            ['<Fragment $HasTextChildren $HasVNodeChildren>{a}</Fragment>', '$HasVNodeChildren', '$HasTextChildren'],
            ['<Fragment $HasKeyedChildren $HasNonKeyedChildren key="k">{a}</Fragment>', '$HasNonKeyedChildren', '$HasKeyedChildren']
        ]

        for (const [input, ignored, winner] of cases) {
            it('Should warn about ' + ignored + ' in ' + JSON.stringify(input), () => {
                assert.deepEqual(messages(input), [ignored + ' is ignored because ' + winner + ' takes precedence. Remove one of them.'])
            })

            it('Should compile ' + JSON.stringify(input) + ' the same without ' + ignored, () => {
                const ignoredAttribute = new RegExp(' \\' + ignored + '(=\\{[^}]*\\})?')

                assert.equal(transform(input), transform(input.replace(ignoredAttribute, '')))
            })
        }

        it('Should warn about every ignored child flag', () => {
            assert.deepEqual(messages('<div $HasVNodeChildren $HasTextChildren $ChildFlag={x}>{a}</div>'), [
                '$HasVNodeChildren is ignored because $ChildFlag takes precedence. Remove one of them.',
                '$HasTextChildren is ignored because $ChildFlag takes precedence. Remove one of them.'
            ])
        })

        it('Should point at the ignored flag', () => {
            assert.match(warnings('<div $HasKeyedChildren $HasNonKeyedChildren>{a}</div>')[0], /^ts-plugin-inferno: file\.tsx\(1,24\): /)
        })

        it('Should warn about $ReCreate with $Flags on an element', () => {
            assert.deepEqual(messages('<div $ReCreate $Flags={9}/>'), ['$ReCreate is ignored because $Flags replaces the vNode flags. Include ReCreate (2048) in $Flags instead.'])
            assert.equal(transform('<div $ReCreate $Flags={9}/>'), transform('<div $Flags={9}/>'))
        })

        it('Should warn about $ReCreate with $Flags on a component', () => {
            assert.deepEqual(messages('<Foo $Flags={2} $ReCreate/>'), ['$ReCreate is ignored because $Flags replaces the vNode flags. Include ReCreate (2048) in $Flags instead.'])
            assert.equal(transform('<Foo $Flags={2} $ReCreate/>'), transform('<Foo $Flags={2}/>'))
        })
    })

    describe('Fragments', () => {
        const cases = [
            ['<Fragment $Flags={1}>{x}</Fragment>', '$Flags'],
            ['<Fragment $ReCreate>{x}</Fragment>', '$ReCreate'],
            ['<Inferno.Fragment $Flags={1} key="k">{x}</Inferno.Fragment>', '$Flags'],
            ['<React.Fragment $ReCreate>{x}</React.Fragment>', '$ReCreate']
        ]

        for (const [input, flag] of cases) {
            it('Should warn about ' + flag + ' in ' + JSON.stringify(input), () => {
                assert.deepEqual(messages(input), [flag + FRAGMENT])
            })

            it('Should compile ' + JSON.stringify(input) + ' the same without ' + flag, () => {
                assert.equal(transform(input), transform(input.replace(/ \$(Flags=\{1\}|ReCreate)/, '')))
            })
        }

        it('Should warn about $Flags and $ReCreate together on a Fragment', () => {
            assert.deepEqual(messages('<Fragment $ReCreate $Flags={1}>{x}</Fragment>'), ['$ReCreate' + FRAGMENT, '$Flags' + FRAGMENT])
        })

        it('Should warn about a Fragment flag and a child flag separately', () => {
            assert.deepEqual(messages('<Fragment $Flags={1} $HasNonKeyedChildren><a/><b/></Fragment>'), ['$Flags' + FRAGMENT, '$HasNonKeyedChildren' + KNOWN])
        })
    })

    describe('nested JSX', () => {
        it('Should warn about a flag on a child element', () => {
            const result = warnings('<div>{a}<p $HasTextChildren>text</p></div>')

            assert.equal(result.length, 1)
            assert.match(result[0], /^ts-plugin-inferno: file\.tsx\(1,12\): \$HasTextChildren is not needed/)
        })

        it('Should warn about a flag in JSX inside an attribute', () => {
            assert.deepEqual(messages('<Foo icon={<b $HasVNodeChildren><i/></b>} />'), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should warn about a flag in a children prop', () => {
            assert.deepEqual(messages('<div children={<b $HasVNodeChildren><i/></b>} />'), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should warn about a flag in a spread attribute', () => {
            assert.deepEqual(messages('<div {...{children: <b $HasVNodeChildren><i/></b>}} />'), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should warn once for each element', () => {
            assert.deepEqual(messages('<ul $HasNonKeyedChildren><li $HasTextChildren>a</li><li $HasTextChildren>b</li></ul>'), [
                '$HasTextChildren' + KNOWN,
                '$HasTextChildren' + KNOWN,
                '$HasNonKeyedChildren' + KNOWN
            ])
        })
    })

    describe('uselessFlags option', () => {
        const input = '<div $HasVNodeChildren><h1>Hi</h1></div>'

        it('Should warn by default', () => {
            assert.deepEqual(messages(input), ['$HasVNodeChildren' + KNOWN])
            assert.deepEqual(messages(input, {}), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should warn with "warn"', () => {
            assert.deepEqual(messages(input, {uselessFlags: 'warn'}), ['$HasVNodeChildren' + KNOWN])
        })

        it('Should not warn with "off"', () => {
            assert.deepEqual(warnings(input, {uselessFlags: 'off'}), [])
            assert.deepEqual(warnings('<Foo $HasKeyedChildren>{a}</Foo>', {uselessFlags: 'off'}), [])
        })

        it('Should throw with "error"', () => {
            expectThrows(
                () => transformWarnings(input, {uselessFlags: 'error'}),
                'file.tsx(1,6): $HasVNodeChildren' + KNOWN + '\n> 1 | <div $HasVNodeChildren><h1>Hi</h1></div>\n    |      ^^^^^^^^^^^^^^^^^'
            )
        })

        it('Should throw for conflicting flags with "error"', () => {
            expectThrows(
                () => transformWarnings('<div $HasKeyedChildren $HasNonKeyedChildren>{a}</div>', {uselessFlags: 'error'}),
                '$HasNonKeyedChildren is ignored because $HasKeyedChildren takes precedence. Remove one of them.'
            )
        })

        it('Should not throw with "error" when every flag is needed', () => {
            assert.equal(transformWarnings('<div $HasKeyedChildren>{a}</div>', {uselessFlags: 'error'}).code, 'createVNode(1, "div", null, a, 8);')
        })

        it('Should compile the same with every level', () => {
            const expected = transformWarnings(input, {uselessFlags: 'off'}).code

            assert.equal(transformWarnings(input, {uselessFlags: 'warn'}).code, expected)
            assert.equal(transformWarnings(input).code, expected)
        })

        it('Should reject an unknown level', () => {
            expectThrows(
                () => transformer({uselessFlags: 'warning' as any}),
                'ts-plugin-inferno: the uselessFlags option must be "warn", "error" or "off", got "warning".'
            )
        })

        it('Should reject a boolean level', () => {
            expectThrows(
                () => transformer({uselessFlags: false as any}),
                'ts-plugin-inferno: the uselessFlags option must be "warn", "error" or "off", got false.'
            )
        })
    })

    describe('warning format', () => {
        it('Should include the file name', () => {
            const result = transformWarnings('<div $HasVNodeChildren><h1>Hi</h1></div>', undefined, 'src/App.tsx')

            assert.equal(result.warnings.length, 1)
            assert.equal(result.warnings[0].split('\n')[0], 'ts-plugin-inferno: src/App.tsx(1,6): $HasVNodeChildren' + KNOWN)
        })

        it('Should warn without a code frame about JSX built without source locations', () => {
            const makeJSX: ts.TransformerFactory<ts.SourceFile> = context => {
                const {factory} = context
                const visit = (node: ts.Node): ts.Node => {
                    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'makeJSX') {
                        return factory.createJsxElement(
                            factory.createJsxOpeningElement(factory.createIdentifier('div'), undefined, factory.createJsxAttributes([
                                factory.createJsxAttribute(factory.createIdentifier('$HasTextChildren'), undefined)
                            ])),
                            [factory.createJsxText('text')],
                            factory.createJsxClosingElement(factory.createIdentifier('div'))
                        )
                    }
                    return ts.visitEachChild(node, visit, context)
                }

                return sourceFile => ts.visitNode(sourceFile, visit) as ts.SourceFile
            }
            const result = collectWarnings(() => ts.transpileModule('export const el = makeJSX();', {
                fileName: 'file.tsx',
                compilerOptions: {jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, ignoreDeprecations: '6.0', alwaysStrict: false},
                transformers: {before: [makeJSX], after: [transformer()]}
            }).outputText)

            assert.deepEqual(result.warnings, ['ts-plugin-inferno: file.tsx: $HasTextChildren' + KNOWN])
            assert.equal(stripInfernoImport(result.result), 'export const el = createVNode(1, "div", null, "text", 16);\n')
        })
    })
})
