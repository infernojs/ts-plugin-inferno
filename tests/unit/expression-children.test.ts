import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {es5, stripInfernoImport, transform, transformWith} from './helpers'

// Runs ES5 output that declares `vNode`, with a createVNode stub returning its arguments
function runES5VNode(input: string, scope: Record<string, unknown>): any {
    const code = stripInfernoImport(transformWith(input, es5))
    const createVNode = (flags, type, className, children, childFlags) => ({flags, type, className, children, childFlags})

    return new Function('createVNode', ...Object.keys(scope), `${code}\nreturn vNode;`)(createVNode, ...Object.values(scope))
}

describe('Expression children', () => {
    describe('empty expressions', () => {
        it('Should create no children for a component with only a comment', () => {
            assert.equal(transform('<Foo>{/* c */}</Foo>'), 'createComponentVNode(2, Foo);')
        })

        it('Should create an empty fragment for a fragment with only a comment', () => {
            assert.equal(transform('<>{/* c */}</>'), 'createFragment();')
        })

        it('Should ignore a comment next to a dynamic child', () => {
            assert.equal(transform('<div>{/* c */}{a}</div>'), 'createVNode(1, "div", null, a, 0);')
        })

        it('Should ignore a comment between dynamic children', () => {
            assert.equal(transform('<div>{a}{/* x */}{b}</div>'), 'createVNode(1, "div", null, [a, b], 0);')
        })

        it('Should ignore a comment next to component text', () => {
            assert.equal(transform('<Foo>{/* c */}text</Foo>'), 'createComponentVNode(2, Foo, { "children": "text" });')
        })
    })

    describe('literal expressions', () => {
        it('Should pass a string literal child as is', () => {
            assert.equal(transform('<div>{"literal"}</div>'), 'createVNode(1, "div", null, "literal", 0);')
        })

        it('Should pass several string literal children as is', () => {
            assert.equal(transform('<div>{"a"}{"b"}</div>'), 'createVNode(1, "div", null, ["a", "b"], 0);')
        })

        it('Should pass a number child', () => {
            assert.equal(transform('<div>{1}</div>'), 'createVNode(1, "div", null, 1, 0);')
        })

        it('Should pass a null child', () => {
            assert.equal(transform('<div>{null}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should pass an undefined child', () => {
            assert.equal(transform('<div>{undefined}</div>'), 'createVNode(1, "div", null, undefined, 0);')
        })

        it('Should pass a boolean child', () => {
            assert.equal(transform('<div>{true}</div>'), 'createVNode(1, "div", null, true, 0);')
        })

        it('Should pass a template literal child', () => {
            assert.equal(transform('<div>{`tpl ${x}`}</div>'), 'createVNode(1, "div", null, `tpl ${x}`, 0);')
        })

        it('Should pass string literals containing JSX text special characters', () => {
            assert.equal(transform('<div>{">"}{"}"}</div>'), 'createVNode(1, "div", null, [">", "}"], 0);')
        })
    })

    describe('dynamic expressions', () => {
        it('Should compile JSX inside a logical expression', () => {
            assert.equal(transform('<div>{cond && <span/>}</div>'), 'createVNode(1, "div", null, cond && createVNode(1, "span"), 0);')
        })

        it('Should compile JSX inside a ternary', () => {
            assert.equal(transform('<div>{cond ? <a/> : <b/>}</div>'), 'createVNode(1, "div", null, cond ? createVNode(1, "a") : createVNode(1, "b"), 0);')
        })

        it('Should compile keyed JSX returned from map', () => {
            assert.equal(transform('<div>{list.map(i => <li key={i}>{i}</li>)}</div>'), 'createVNode(1, "div", null, list.map(i => createVNode(1, "li", null, i, 0, null, i)), 0);')
        })

        it('Should compile keyed JSX returned from map with a typed parameter', () => {
            assert.equal(transform('<div>{list.map((i: number) => <li key={i}>{i}</li>)}</div>'), 'createVNode(1, "div", null, list.map((i) => createVNode(1, "li", null, i, 0, null, i)), 0);')
        })

        it('Should compile an array literal of keyed JSX', () => {
            assert.equal(transform('<div>{[<a key="1"/>, <b key="2"/>]}</div>'), 'createVNode(1, "div", null, [createVNode(1, "a", null, null, 1, null, "1"), createVNode(1, "b", null, null, 1, null, "2")], 0);')
        })

        it('Should compile an array literal of unkeyed components', () => {
            assert.equal(transform('<div>{[<C/>, <C/>]}</div>'), 'createVNode(1, "div", null, [createComponentVNode(2, C), createComponentVNode(2, C)], 0);')
        })

        it('Should pass a function as component children', () => {
            assert.equal(transform('<Foo>{(v) => <div>{v}</div>}</Foo>'), 'createComponentVNode(2, Foo, { "children": (v) => createVNode(1, "div", null, v, 0) });')
        })

        it('Should pass a typed function as children of a component with type arguments', () => {
            assert.equal(transform('<Foo<string>>{(v: string) => <div>{v}</div>}</Foo>'), 'createComponentVNode(2, Foo, { "children": (v) => createVNode(1, "div", null, v, 0) });')
        })

        it('Should pass an object child as is', () => {
            assert.equal(transform('<div>{ {a} }</div>'), 'createVNode(1, "div", null, { a }, 0);')
        })

        // babel keeps the object spread, TypeScript output uses Object.assign, both copy the props of test
        it('Should compile an expression container holding a spread element', () => {
            assert.equal(transform('<div>{<div {...test} />}</div>'), 'createVNode(1, "div", null, normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, test))), 0);')
        })

        it('Should keep a parenthesized sequence expression', () => {
            assert.equal(transform('<div>{(console.log("foo"), JSON.stringify(props))}</div>'), 'createVNode(1, "div", null, (console.log("foo"), JSON.stringify(props)), 0);')
        })

        it('Should keep optional chaining in a sequence expression', () => {
            assert.equal(transform('<div>{(this?.class, this.class)}</div>'), 'createVNode(1, "div", null, (this?.class, this.class), 0);')
        })
    })

    // Type-only syntax is erased before the plugin runs, the child stays dynamic
    describe('type assertions', () => {
        it('Should compile an as expression child', () => {
            assert.equal(transform('<div>{value as string}</div>'), 'createVNode(1, "div", null, value, 0);')
        })

        it('Should compile a non-null assertion child', () => {
            assert.equal(transform('<div>{maybe!}</div>'), 'createVNode(1, "div", null, maybe, 0);')
        })

        it('Should compile a satisfies expression child', () => {
            assert.equal(transform('<div>{(x satisfies Item)}</div>'), 'createVNode(1, "div", null, x, 0);')
        })
    })

    describe('spread children', () => {
        it('Should spread children of an element', () => {
            assert.equal(transform('<div>{...children}</div>'), 'createVNode(1, "div", null, [...children], 0);')
        })

        it('Should spread children given with a type assertion', () => {
            assert.equal(transform('<div>{...(items as Item[])}</div>'), 'createVNode(1, "div", null, [...items], 0);')
        })

        it('Should spread children of a component', () => {
            assert.equal(transform('<Foo>{...children}</Foo>'), 'createComponentVNode(2, Foo, { "children": [...children] });')
        })

        it('Should spread children of a fragment', () => {
            assert.equal(transform('<>{...children}</>'), 'createFragment([...children], 0);')
        })

        it('Should spread children of a keyed Fragment', () => {
            assert.equal(transform('<Fragment key="k">{...a}</Fragment>'), 'createFragment([...a], 0, "k");')
        })

        it('Should spread several children in order (oxc spread-children-multiple-automatic)', () => {
            assert.equal(transform('<div>{...[1, 2]}{...[3, 4]}</div>'), 'createVNode(1, "div", null, [...[1, 2], ...[3, 4]], 0);')
        })

        it('Should spread children around a static element (oxc spread-children-mixed-automatic)', () => {
            assert.equal(transform('<div>{...a}<span/>{...b}</div>'), 'createVNode(1, "div", null, [...a, createVNode(1, "span"), ...b], 0);')
        })

        it('Should spread a JSX element child (babel constant-elements)', () => {
            assert.equal(transform('<div>{...<span/>}</div>'), 'createVNode(1, "div", null, [...createVNode(1, "span")], 0);')
        })

        it('Should spread children next to text', () => {
            assert.equal(transform('<div>text{...a}</div>'), 'createVNode(1, "div", null, [createTextVNode("text"), ...a], 0);')
        })

        it('Should spread component children next to text', () => {
            assert.equal(transform('<Foo>text{...a}</Foo>'), 'createComponentVNode(2, Foo, { "children": ["text", ...a] });')
        })

        it('Should normalize spread children next to a keyed child', () => {
            assert.equal(transform('<div><span key="k"/>{...a}</div>'), 'createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "k"), ...a], 0);')
        })

        it('Should use the child flag given for spread children', () => {
            assert.equal(transform('<div $HasNonKeyedChildren>{...a}</div>'), 'createVNode(1, "div", null, [...a], 4);')
        })

        // The plugin runs as an `after` transformer, so a spread it emits is not downleveled by TypeScript
        it('Should compile spread children for ES5 targets', () => {
            const a = [1, 2]
            const code = transformWith('const vNode = <div>{...a}</div>;', es5)
            const vNode = runES5VNode('const vNode = <div>{...a}</div>;', {a})

            assert.doesNotMatch(code, /\.\.\./)
            assert.deepEqual(vNode.children, [1, 2])
            assert.notEqual(vNode.children, a)
            assert.equal(vNode.childFlags, 0)
        })

        // Array.prototype.concat flattens array arguments, so plain children are wrapped to keep an array child nested
        it('Should keep the order of spread and plain children for ES5 targets', () => {
            const input = 'const vNode = <div>{...a}{b}{...c}</div>;'

            assert.equal(
                stripInfernoImport(transformWith(input, es5)),
                'var vNode = createVNode(1, "div", null, Array.prototype.slice.call(a).concat([b], Array.prototype.slice.call(c)), 0);'
            )
            assert.deepEqual(runES5VNode(input, {a: [1], b: [2], c: [3]}).children, [1, [2], 3])
        })
    })

    describe('children prop', () => {
        it('Should use a JSX element children prop given in braces', () => {
            assert.equal(transform('<div children={<span/>} />'), 'createVNode(1, "div", null, createVNode(1, "span"), 2);')
        })

        it('Should create no children for a null children prop', () => {
            assert.equal(transform('<div children={null} />'), 'createVNode(1, "div");')
        })

        it('Should normalize a string children prop', () => {
            assert.equal(transform('<div children={"txt"} />'), 'createVNode(1, "div", null, "txt", 0);')
        })

        it('Should normalize an array children prop', () => {
            assert.equal(transform('<div children={[a, b]} />'), 'createVNode(1, "div", null, [a, b], 0);')
        })

        it('Should normalize an unknown children prop expression', () => {
            assert.equal(transform('<div children={a} />'), 'createVNode(1, "div", null, a, 0);')
        })

        it('Should normalize a children prop expression with a type assertion', () => {
            assert.equal(transform('<div children={a as Child} />'), 'createVNode(1, "div", null, a, 0);')
        })

        it('Should use a JSX element children prop given without braces', () => {
            assert.equal(transform('<div children=<span/> />'), 'createVNode(1, "div", null, createVNode(1, "span"), 2);')
        })

        it('Should use a JSX fragment children prop given without braces', () => {
            assert.equal(transform('<div children=<>{a}</> />'), 'createVNode(1, "div", null, createFragment(a, 0), 2);')
        })

        it('Should trust $HasVNodeChildren for a children prop expression', () => {
            assert.equal(transform('<div $HasVNodeChildren children={a} />'), 'createVNode(1, "div", null, a, 2);')
        })

        it('Should normalize a Fragment children prop like Fragment children', () => {
            assert.equal(transform('<Fragment children={a} />'), 'createFragment(a, 0);')
        })

        it('Should normalize a JSX Fragment children prop', () => {
            assert.equal(transform('<Fragment children={<span/>} />'), 'createFragment(createVNode(1, "span"), 0);')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should mark an element with only a comment child as UnknownChildren', () => {
            assert.equal(transform('<div>{/* comment */}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should mark an element with an empty expression as UnknownChildren', () => {
            assert.equal(transform('<div>{}</div>'), 'createVNode(1, "div", null, null, 0);')
        })

        it('Should wrap text next to a comment in createTextVNode with UnknownChildren', () => {
            assert.equal(transform('<div>{/* c */}text</div>'), 'createVNode(1, "div", null, createTextVNode("text"), 0);')
        })

        it('Should mark static siblings around a comment as UnknownChildren', () => {
            assert.equal(transform('<div><span/>{/* c */}<span/></div>'), 'createVNode(1, "div", null, [createVNode(1, "span"), createVNode(1, "span")], 0);')
        })
    })
})
