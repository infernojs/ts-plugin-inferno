import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {commonJS, expectThrows, transform, transformWarnings, transformWith} from './helpers'

describe('Special flags', () => {
    describe('flag precedence', () => {
        it('Should throw for $HasVNodeChildren on text', () => {
            expectThrows(() => transform('<div $HasVNodeChildren>text</div>'), '$HasVNodeChildren needs one element or component child, but the child is text.')
        })

        it('Should throw for $HasVNodeChildren on several children', () => {
            expectThrows(() => transform('<div $HasVNodeChildren><a/><b/></div>'), '$HasVNodeChildren needs one element or component child, but there are 2 children.')
        })

        it('Should use $HasKeyedChildren for static children', () => {
            assert.equal(transform('<div $HasKeyedChildren><a key="1"/><b key="2"/></div>'), 'newVNode(33, "div", null, [newVNode(17, "a", null, null, null, "1"), newVNode(17, "b", null, null, null, "2")]);')
        })

        it('Should throw for $HasKeyedChildren on static children without keys', () => {
            expectThrows(() => transform('<div $HasKeyedChildren><a/><b/></div>'), '$HasKeyedChildren needs an array of elements or components that all have a key, but the child at index 0 has no key.')
        })

        it('Should prefer $HasKeyedChildren over $HasNonKeyedChildren', () => {
            assert.equal(transform('<div $HasKeyedChildren $HasNonKeyedChildren>{a}</div>'), 'newVNode(33, "div", null, a);')
        })

        it('Should prefer $ChildFlag over other child flags', () => {
            assert.equal(transform('<div $ChildFlag={1} $HasKeyedChildren>{a}</div>'), 'newVNode(17, "div", null, a);')
        })

        it('Should strip type syntax from a $ChildFlag expression', () => {
            assert.equal(transform('<div $ChildFlag={flag as ChildFlags}>{a}</div>'), 'createVNode(1, "div", null, a, flag);')
        })

        it('Should prefer $Flags over contentEditable', () => {
            assert.equal(transform('<div contentEditable $Flags={9}/>'), 'newVNode(25, "div", null, null, { "contentEditable": true });')
        })

        it('Should use a $Flags expression as the flags of a generic component', () => {
            assert.equal(transform('<Foo<T> $Flags={flags as number} />'), 'newComponentVNode(flags | 16, Foo);')
        })
    })

    describe('child flags that the children cannot have', () => {
        // The message of the error the plugin throws, or null when it compiles
        function error(input: string, uselessFlags: 'warn' | 'error' | 'off' = 'off'): string | null {
            try {
                transformWarnings(input, {uselessFlags})
            } catch (e) {
                return e instanceof Error ? e.message : String(e)
            }
            return null
        }

        function errorIncludes(input: string, message: string) {
            const actual = error(input)

            assert.ok(actual !== null && actual.includes(message), `Expected the error of ${input} to include:\n${message}\nActual:\n${actual}`)
        }

        it('Should point at the flag with a code frame', () => {
            assert.equal(error('function App() {\n  return (\n    <ul $HasKeyedChildren>\n      <li/>\n    </ul>\n  );\n}'),
                'file.tsx(3,9): $HasKeyedChildren needs an array of elements or components that all have a key, but the only child is an element, not an array.\n' +
                '  1 | function App() {\n' +
                '  2 |   return (\n' +
                '> 3 |     <ul $HasKeyedChildren>\n' +
                '    |         ^^^^^^^^^^^^^^^^^\n' +
                '  4 |       <li/>\n' +
                '  5 |     </ul>\n' +
                '  6 |   );'
            )
        })

        it('Should throw whatever the uselessFlags option is', () => {
            const input = '<div $HasVNodeChildren>{[a, b]}</div>'
            const message = '$HasVNodeChildren needs one element or component child, but the child is an array.'

            assert.ok(error(input, 'off').includes(message))
            assert.ok(error(input, 'warn').includes(message))
            assert.ok(error(input, 'error').includes(message))
        })

        it('Should throw for an array children prop with $HasVNodeChildren', () => {
            errorIncludes('<div $HasVNodeChildren children={[a, b]} />', '$HasVNodeChildren needs one element or component child, but the child is an array.')
        })

        it('Should throw for literal text with $HasVNodeChildren', () => {
            errorIncludes('<div $HasVNodeChildren>{`a${b}`}</div>', '$HasVNodeChildren needs one element or component child, but the child is text.')
            errorIncludes('<div $HasVNodeChildren>{1}</div>', '$HasVNodeChildren needs one element or component child, but the child is text.')
        })

        it('Should throw for a boolean child with $HasTextChildren', () => {
            errorIncludes('<div $HasTextChildren>{true}</div>', '$HasTextChildren needs one text child, but the child is true, which renders nothing.')
        })

        it('Should throw for an array item without a key with $HasKeyedChildren', () => {
            errorIncludes('<div $HasKeyedChildren>{[<a key="1"/>, <b/>]}</div>', '$HasKeyedChildren needs an array of elements or components that all have a key, but the array item at index 1 has no key.')
        })

        it('Should not throw for an array of keyed items with $HasKeyedChildren', () => {
            assert.equal(error('<div $HasKeyedChildren>{[<a key="1"/>, <b key="2"/>]}</div>'), null)
        })

        it('Should throw for a child that renders nothing in non keyed children', () => {
            errorIncludes('<div $HasNonKeyedChildren><a/>{null}</div>', '$HasNonKeyedChildren needs an array of elements or components, but the child at index 1 is null, which renders nothing.')
        })

        it('Should throw for a nested array in non keyed children', () => {
            errorIncludes('<div $HasNonKeyedChildren><a/>{[b]}</div>', '$HasNonKeyedChildren needs an array of elements or components, but the child at index 1 is an array, which makes a nested array.')
        })

        it('Should not throw for text next to elements in non keyed children', () => {
            assert.equal(error('<div $HasNonKeyedChildren><a/>text</div>'), null)
        })

        it('Should only check the child flag that takes precedence', () => {
            assert.equal(error('<div $HasNonKeyedChildren $HasVNodeChildren><a/><b/></div>'), null)
            errorIncludes('<div $HasVNodeChildren $HasNonKeyedChildren><a/></div>', '$HasNonKeyedChildren needs an array of elements or components, but the only child is an element, not an array.')
        })

        it('Should not check child flags on components', () => {
            assert.equal(error('<Foo $HasVNodeChildren>text</Foo>'), null)
            assert.equal(error('<Foo $ChildFlag={3}>text</Foo>'), null)
        })

        it('Should not check $ChildFlag expressions and UnknownChildren', () => {
            assert.equal(error('<div $ChildFlag={flag}>text</div>'), null)
            assert.equal(error('<div $ChildFlag={0}>text</div>'), null)
        })

        it('Should check a numeric $ChildFlag like the flag of its value', () => {
            errorIncludes('<div $ChildFlag={2}>text</div>', '$ChildFlag={2} (HasVNodeChildren) needs one element or component child, but the child is text.')
            errorIncludes('<div $ChildFlag={16}><a/></div>', '$ChildFlag={16} (HasTextChildren) needs one text child, but the child is an element.')
        })

        it('Should not throw for dynamic children', () => {
            assert.equal(error('<div $HasVNodeChildren>{cond ? <a/> : null}</div>'), null)
            assert.equal(error('<div $HasTextChildren>{name}</div>'), null)
            assert.equal(error('<div $HasKeyedChildren>{items.map(render)}</div>'), null)
        })

        // Babel's parser drops parentheses, the TypeScript syntax does not change the value either
        it('Should look through parentheses and type assertions', () => {
            errorIncludes('<div $HasTextChildren>{(<a/>)}</div>', '$HasTextChildren needs one text child, but the child is an element.')
            errorIncludes('<div $HasTextChildren children={<a/> as any} />', '$HasTextChildren needs one text child, but the child is an element.')
            errorIncludes('<div $HasVNodeChildren>{"text" as string}</div>', '$HasVNodeChildren needs one element or component child, but the child is text.')
            errorIncludes('<div $HasKeyedChildren>{[(<a/>)]}</div>', '$HasKeyedChildren needs an array of elements or components that all have a key, but the array item at index 0 has no key.')
            errorIncludes('<div $ChildFlag={(2)}>text</div>', '$ChildFlag={2} (HasVNodeChildren) needs one element or component child, but the child is text.')
        })

        it('Should throw for a children attribute without a value', () => {
            errorIncludes('<div $HasVNodeChildren children />', '$HasVNodeChildren needs one element or component child, but the child is true, which renders nothing.')
        })
    })

    describe('packed flags of the v10 factories', () => {
        it('Should put the child bit of each children shape into the flags', () => {
            assert.equal(transform('<div/>'), 'newVNode(17, "div");')
            assert.equal(transform('<div>text</div>'), 'newVNode(3, "div", null, "text");')
            assert.equal(transform('<div><a/><b/></div>'), 'newVNode(5, "div", null, [newVNode(17, "a"), newVNode(17, "b")]);')
            assert.equal(transform('<div><a/></div>'), 'newVNode(9, "div", null, newVNode(17, "a"));')
            assert.equal(transform('<div $HasKeyedChildren>{a}</div>'), 'newVNode(33, "div", null, a);')
        })

        it('Should leave the child bit out for children that are normalized', () => {
            assert.equal(transform('<div>{a}</div>'), 'newVNode(1, "div", null, a);')
        })

        it('Should keep the element flags of svg and form elements', () => {
            assert.equal(transform('<svg><path/></svg>'), 'newVNode(72, "svg", null, newVNode(80, "path"));')
            assert.equal(transform('<input/>'), 'newVNode(528, "input");')
        })

        it('Should give components the ComponentUnknown flags, which are 0', () => {
            assert.equal(transform('<Foo/>'), 'newComponentVNode(0, Foo);')
        })

        it('Should add the child bit to a $Flags expression', () => {
            assert.equal(transform('<div $Flags={f}>text</div>'), 'newVNode(f | 2, "div", null, "text");')
            assert.equal(transform('<div $Flags={a ? b : c}/>'), 'newVNode((a ? b : c) | 16, "div");')
        })

        it('Should not add a child bit to a $Flags expression of normalized children', () => {
            assert.equal(transform('<div $Flags={f}>{a}</div>'), 'newVNode(f, "div", null, a);')
        })

        it('Should fold a numeric $ChildFlag into the flags', () => {
            assert.equal(transform('<div $ChildFlag={16}>{a}</div>'), 'newVNode(3, "div", null, a);')
        })

        it('Should throw for a $ChildFlag number that is not a ChildFlags value', () => {
            expectThrows(() => transform('<div $ChildFlag={3}>{a}</div>'), '$ChildFlag={3} is not a ChildFlags value. Use 0 (UnknownChildren), 1 (HasInvalidChildren), 2 (HasVNodeChildren), 4 (HasNonKeyedChildren), 8 (HasKeyedChildren) or 16 (HasTextChildren).')
        })

        it('Should import createVNode next to newVNode for a $ChildFlag expression', () => {
            assert.equal(transformWith('<div><span $ChildFlag={flag}>{a}</span></div>'), 'import { newVNode, createVNode } from "inferno";\nnewVNode(9, "div", null, createVNode(1, "span", null, a, flag));')
        })

        // Unlike babel, a dynamic child is passed as written and not in an array, see fragments.test.ts
        it('Should call createFragment for a $ChildFlag expression on a Fragment', () => {
            assert.equal(transformWith('<Fragment $ChildFlag={flag}>{a}</Fragment>'), 'import { createFragment } from "inferno";\ncreateFragment(a, flag);')
        })

        it('Should require createVNode next to newVNode for a $ChildFlag expression for CommonJS', () => {
            assert.equal(
                transformWith('<div><span $ChildFlag={flag}>{a}</span></div>', commonJS),
                'var $inferno = require("inferno");\nvar newVNode = $inferno.newVNode;\nvar createVNode = $inferno.createVNode;\nnewVNode(9, "div", null, createVNode(1, "span", null, a, flag));'
            )
        })

        it('Should fold a numeric $Flags of a component', () => {
            assert.equal(transform('<Foo $Flags={8}/>'), 'newComponentVNode(24, Foo);')
        })

        // Babel's parser drops the parentheses
        it('Should fold parenthesized numeric flags like babel', () => {
            assert.equal(transform('<div $Flags={(9)}/>'), 'newVNode(25, "div");')
            assert.equal(transform('<div $ChildFlag={(16)}>{a}</div>'), 'newVNode(3, "div", null, a);')
        })
    })

    describe('$ReCreate', () => {
        const MESSAGE = '$ReCreate has been removed in Inferno 10. To re-create the element, change its key instead, for example key={version}.'

        it('Should throw for $ReCreate on elements and point at it', () => {
            expectThrows(() => transform('<div $ReCreate/>'), 'file.tsx(1,6): ' + MESSAGE + '\n> 1 | <div $ReCreate/>\n    |      ^^^^^^^^^')
        })

        it('Should throw for $ReCreate on components', () => {
            expectThrows(() => transform('<Foo $ReCreate/>'), MESSAGE)
        })

        it('Should throw for $ReCreate on input and svg elements', () => {
            expectThrows(() => transform('<input $ReCreate/>'), MESSAGE)
            expectThrows(() => transform('<svg $ReCreate/>'), MESSAGE)
        })

        it('Should throw for $ReCreate on Fragments', () => {
            expectThrows(() => transform('<Fragment $ReCreate>{x}</Fragment>'), MESSAGE)
        })

        it('Should throw for $ReCreate on generic components', () => {
            expectThrows(() => transform('<Foo<T> $ReCreate/>'), MESSAGE)
        })

        it('Should throw for $ReCreate whatever the uselessFlags option is', () => {
            expectThrows(() => transformWarnings('<div $ReCreate/>', {uselessFlags: 'off'}), MESSAGE)
            expectThrows(() => transformWarnings('<div $ReCreate/>', {uselessFlags: 'error'}), MESSAGE)
        })
    })

    describe('other combinations', () => {
        it('Should throw for $HasTextChildren without children', () => {
            expectThrows(() => transform('<div $HasTextChildren />'), '$HasTextChildren needs one text child, but there are no children.')
        })

        it('Should ignore child flags on components', () => {
            assert.equal(transform('<Foo $HasKeyedChildren>{a}</Foo>'), 'newComponentVNode(0, Foo, { "children": a });')
        })

        it('Should keep $Flags with a spread', () => {
            assert.equal(transform('<div $Flags={1} {...p}/>'), 'normalizeProps(newVNode(17, "div", null, null, Object.assign({}, p)));')
        })

        // $Flags replaces the flags of elements and components, like babel it is dropped on a Fragment
        it('Should drop $Flags on a Fragment', () => {
            assert.equal(transform('<Fragment $Flags={1}>x</Fragment>'), 'newFragment(260, [newTextVNode("x")]);')
        })

        it('Should keep $HasVNodeChildren with a spread', () => {
            assert.equal(transform('<div {...p} $HasVNodeChildren>{a}</div>'), 'normalizeProps(newVNode(9, "div", null, a, Object.assign({}, p)));')
        })
    })

    // $HasVNodeChildren declares a single vNode, several children are an array
    describe('several children declared as vNodes', () => {
        it('Should throw for several dynamic children', () => {
            expectThrows(() => transform('<div $HasVNodeChildren>{a}{b}</div>'), '$HasVNodeChildren needs one element or component child, but there are 2 children.')
        })

        it('Should throw for a dynamic child next to whitespace', () => {
            expectThrows(() => transform('<div $HasVNodeChildren>{a} </div>'), '$HasVNodeChildren needs one element or component child, but there are 2 children.')
        })

        it('Should throw for a spread child', () => {
            expectThrows(() => transform('<div $HasVNodeChildren>{...a}</div>'), '$HasVNodeChildren needs one element or component child, but the child is a spread, which makes an array.')
        })

        it('Should throw for an array children prop', () => {
            expectThrows(() => transform('<div $HasVNodeChildren children={[a, b]} />'), '$HasVNodeChildren needs one element or component child, but the child is an array.')
        })

        it('Should keep a single dynamic child as a vNode', () => {
            assert.equal(transform('<div $HasVNodeChildren>{a}</div>'), 'newVNode(9, "div", null, a);')
        })
    })

    // A valueless flag was passed as true, which Inferno reads as flag 1: HasInvalidChildren drops the children and
    // HtmlElement turns a component into an element
    describe('valueless flags', () => {
        it('Should reject a valueless $ChildFlag', () => {
            expectThrows(() => transform('<div $ChildFlag>{a}</div>'), 'file.tsx(1,6): Please provide an explicit $ChildFlag value, e.g. $ChildFlag={flags}.')
        })

        it('Should reject a valueless $Flags', () => {
            expectThrows(() => transform('<Foo $Flags />'), 'file.tsx(1,6): Please provide an explicit $Flags value, e.g. $Flags={flags}.')
        })

        it('Should reject an empty $ChildFlag expression', () => {
            expectThrows(() => transform('<div $ChildFlag={/* flags */}>{a}</div>'), 'Please provide an explicit $ChildFlag value')
        })

        it('Should reject an empty $Flags expression', () => {
            expectThrows(() => transform('<div $Flags={}/>'), 'Please provide an explicit $Flags value')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should add the ContentEditable flag to components', () => {
            assert.equal(transform('<Foo contentEditable/>'), 'newComponentVNode(131072, Foo, { "contentEditable": true });')
        })

        it('Should throw for $HasTextChildren on several children', () => {
            expectThrows(() => transform('<div $HasTextChildren><a/><b/></div>'), '$HasTextChildren needs one text child, but there are 2 children.')
        })

        it('Should pass a string $ChildFlag through as a string', () => {
            assert.equal(transform('<div $ChildFlag="1">{a}</div>'), 'createVNode(1, "div", null, a, "1");')
        })
    })
})
