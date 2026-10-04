import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {es5, stripInfernoImport, transform, transformWith} from './helpers'

// Runs ES5 output that declares `vNode`, with a newVNode stub returning its arguments
function runES5VNode(input: string, scope: Record<string, unknown>): any {
    const code = stripInfernoImport(transformWith(input, es5))
    const newVNode = (flags, type, className, children) => ({flags, type, className, children})

    return new Function('newVNode', ...Object.keys(scope), `${code}\nreturn vNode;`)(newVNode, ...Object.values(scope))
}

describe('Expression children', () => {
    describe('empty expressions', () => {
        it('Should create no children for a component with only a comment', () => {
            assert.equal(transform('<Foo>{/* c */}</Foo>'), 'newComponentVNode(0, Foo);')
        })

        it('Should create an empty fragment for a fragment with only a comment', () => {
            assert.equal(transform('<>{/* c */}</>'), 'newFragment(272);')
        })

        it('Should ignore a comment next to a dynamic child', () => {
            assert.equal(transform('<div>{/* c */}{a}</div>'), 'newVNode(1, "div", null, a);')
        })

        it('Should ignore a comment between dynamic children', () => {
            assert.equal(transform('<div>{a}{/* x */}{b}</div>'), 'newVNode(1, "div", null, [a, b]);')
        })

        it('Should ignore a comment next to component text', () => {
            assert.equal(transform('<Foo>{/* c */}text</Foo>'), 'newComponentVNode(0, Foo, { "children": "text" });')
        })
    })

    describe('literal expressions', () => {
        it('Should pass a string literal child as is', () => {
            assert.equal(transform('<div>{"literal"}</div>'), 'newVNode(1, "div", null, "literal");')
        })

        it('Should pass several string literal children as is', () => {
            assert.equal(transform('<div>{"a"}{"b"}</div>'), 'newVNode(1, "div", null, ["a", "b"]);')
        })

        it('Should pass a number child', () => {
            assert.equal(transform('<div>{1}</div>'), 'newVNode(1, "div", null, 1);')
        })

        it('Should pass a null child', () => {
            assert.equal(transform('<div>{null}</div>'), 'newVNode(1, "div");')
        })

        it('Should pass an undefined child', () => {
            assert.equal(transform('<div>{undefined}</div>'), 'newVNode(1, "div", null, undefined);')
        })

        it('Should pass a boolean child', () => {
            assert.equal(transform('<div>{true}</div>'), 'newVNode(1, "div", null, true);')
        })

        it('Should pass a template literal child', () => {
            assert.equal(transform('<div>{`tpl ${x}`}</div>'), 'newVNode(1, "div", null, `tpl ${x}`);')
        })

        it('Should pass string literals containing JSX text special characters', () => {
            assert.equal(transform('<div>{">"}{"}"}</div>'), 'newVNode(1, "div", null, [">", "}"]);')
        })
    })

    describe('dynamic expressions', () => {
        it('Should compile JSX inside a logical expression', () => {
            assert.equal(transform('<div>{cond && <span/>}</div>'), 'newVNode(1, "div", null, cond && newVNode(17, "span"));')
        })

        it('Should compile JSX inside a ternary', () => {
            assert.equal(transform('<div>{cond ? <a/> : <b/>}</div>'), 'newVNode(1, "div", null, cond ? newVNode(17, "a") : newVNode(17, "b"));')
        })

        it('Should compile keyed JSX returned from map', () => {
            assert.equal(transform('<div>{list.map(i => <li key={i}>{i}</li>)}</div>'), 'newVNode(1, "div", null, list.map(i => newVNode(1, "li", null, i, null, i)));')
        })

        it('Should compile keyed JSX returned from map with a typed parameter', () => {
            assert.equal(transform('<div>{list.map((i: number) => <li key={i}>{i}</li>)}</div>'), 'newVNode(1, "div", null, list.map((i) => newVNode(1, "li", null, i, null, i)));')
        })

        it('Should compile an array literal of keyed JSX', () => {
            assert.equal(transform('<div>{[<a key="1"/>, <b key="2"/>]}</div>'), 'newVNode(1, "div", null, [newVNode(17, "a", null, null, null, "1"), newVNode(17, "b", null, null, null, "2")]);')
        })

        it('Should compile an array literal of unkeyed components', () => {
            assert.equal(transform('<div>{[<C/>, <C/>]}</div>'), 'newVNode(1, "div", null, [newComponentVNode(0, C), newComponentVNode(0, C)]);')
        })

        it('Should pass a function as component children', () => {
            assert.equal(transform('<Foo>{(v) => <div>{v}</div>}</Foo>'), 'newComponentVNode(0, Foo, { "children": (v) => newVNode(1, "div", null, v) });')
        })

        it('Should pass a typed function as children of a component with type arguments', () => {
            assert.equal(transform('<Foo<string>>{(v: string) => <div>{v}</div>}</Foo>'), 'newComponentVNode(0, Foo, { "children": (v) => newVNode(1, "div", null, v) });')
        })

        it('Should pass an object child as is', () => {
            assert.equal(transform('<div>{ {a} }</div>'), 'newVNode(1, "div", null, { a });')
        })

        // babel keeps the object spread, TypeScript output uses Object.assign, both copy the props of test
        it('Should compile an expression container holding a spread element', () => {
            assert.equal(transform('<div>{<div {...test} />}</div>'), 'newVNode(1, "div", null, normalizeProps(newVNode(17, "div", null, null, Object.assign({}, test))));')
        })

        it('Should keep a parenthesized sequence expression', () => {
            assert.equal(transform('<div>{(console.log("foo"), JSON.stringify(props))}</div>'), 'newVNode(1, "div", null, (console.log("foo"), JSON.stringify(props)));')
        })

        it('Should keep optional chaining in a sequence expression', () => {
            assert.equal(transform('<div>{(this?.class, this.class)}</div>'), 'newVNode(1, "div", null, (this?.class, this.class));')
        })
    })

    // Type-only syntax is erased before the plugin runs, the child stays dynamic
    describe('type assertions', () => {
        it('Should compile an as expression child', () => {
            assert.equal(transform('<div>{value as string}</div>'), 'newVNode(1, "div", null, value);')
        })

        it('Should compile a non-null assertion child', () => {
            assert.equal(transform('<div>{maybe!}</div>'), 'newVNode(1, "div", null, maybe);')
        })

        it('Should compile a satisfies expression child', () => {
            assert.equal(transform('<div>{(x satisfies Item)}</div>'), 'newVNode(1, "div", null, x);')
        })
    })

    describe('spread children', () => {
        it('Should spread children of an element', () => {
            assert.equal(transform('<div>{...children}</div>'), 'newVNode(1, "div", null, [...children]);')
        })

        it('Should spread children given with a type assertion', () => {
            assert.equal(transform('<div>{...(items as Item[])}</div>'), 'newVNode(1, "div", null, [...items]);')
        })

        it('Should spread children of a component', () => {
            assert.equal(transform('<Foo>{...children}</Foo>'), 'newComponentVNode(0, Foo, { "children": [...children] });')
        })

        it('Should spread children of a fragment', () => {
            assert.equal(transform('<>{...children}</>'), 'newFragment(256, [...children]);')
        })

        it('Should spread children of a keyed Fragment', () => {
            assert.equal(transform('<Fragment key="k">{...a}</Fragment>'), 'newFragment(256, [...a], "k");')
        })

        it('Should spread several children in order (oxc spread-children-multiple-automatic)', () => {
            assert.equal(transform('<div>{...[1, 2]}{...[3, 4]}</div>'), 'newVNode(1, "div", null, [...[1, 2], ...[3, 4]]);')
        })

        it('Should spread children around a static element (oxc spread-children-mixed-automatic)', () => {
            assert.equal(transform('<div>{...a}<span/>{...b}</div>'), 'newVNode(1, "div", null, [...a, newVNode(17, "span"), ...b]);')
        })

        it('Should spread a JSX element child (babel constant-elements)', () => {
            assert.equal(transform('<div>{...<span/>}</div>'), 'newVNode(1, "div", null, [...newVNode(17, "span")]);')
        })

        it('Should spread children next to text', () => {
            assert.equal(transform('<div>text{...a}</div>'), 'newVNode(1, "div", null, [newTextVNode("text"), ...a]);')
        })

        it('Should spread component children next to text', () => {
            assert.equal(transform('<Foo>text{...a}</Foo>'), 'newComponentVNode(0, Foo, { "children": ["text", ...a] });')
        })

        it('Should normalize spread children next to a keyed child', () => {
            assert.equal(transform('<div><span key="k"/>{...a}</div>'), 'newVNode(1, "div", null, [newVNode(17, "span", null, null, null, "k"), ...a]);')
        })

        it('Should use the child flag given for spread children', () => {
            assert.equal(transform('<div $HasNonKeyedChildren>{...a}</div>'), 'newVNode(5, "div", null, [...a]);')
        })

        // The plugin runs as an `after` transformer, so a spread it emits is not downleveled by TypeScript
        it('Should compile spread children for ES5 targets', () => {
            const a = [1, 2]
            const code = transformWith('const vNode = <div>{...a}</div>;', es5)
            const vNode = runES5VNode('const vNode = <div>{...a}</div>;', {a})

            assert.doesNotMatch(code, /\.\.\./)
            assert.deepEqual(vNode.children, [1, 2])
            assert.notEqual(vNode.children, a)
            // HtmlElement without a child bit, Inferno normalizes the children
            assert.equal(vNode.flags, 1)
        })

        // Array.prototype.concat flattens array arguments, so plain children are wrapped to keep an array child nested
        it('Should keep the order of spread and plain children for ES5 targets', () => {
            const input = 'const vNode = <div>{...a}{b}{...c}</div>;'

            assert.equal(
                stripInfernoImport(transformWith(input, es5)),
                'var vNode = newVNode(1, "div", null, Array.prototype.slice.call(a).concat([b], Array.prototype.slice.call(c)));'
            )
            assert.deepEqual(runES5VNode(input, {a: [1], b: [2], c: [3]}).children, [1, [2], 3])
        })
    })

    describe('children prop', () => {
        it('Should use a JSX element children prop given in braces', () => {
            assert.equal(transform('<div children={<span/>} />'), 'newVNode(9, "div", null, newVNode(17, "span"));')
        })

        it('Should create no children for a null children prop', () => {
            assert.equal(transform('<div children={null} />'), 'newVNode(17, "div");')
        })

        it('Should normalize a string children prop', () => {
            assert.equal(transform('<div children={"txt"} />'), 'newVNode(1, "div", null, "txt");')
        })

        it('Should normalize an array children prop', () => {
            assert.equal(transform('<div children={[a, b]} />'), 'newVNode(1, "div", null, [a, b]);')
        })

        it('Should normalize an unknown children prop expression', () => {
            assert.equal(transform('<div children={a} />'), 'newVNode(1, "div", null, a);')
        })

        it('Should normalize a children prop expression with a type assertion', () => {
            assert.equal(transform('<div children={a as Child} />'), 'newVNode(1, "div", null, a);')
        })

        it('Should use a JSX element children prop given without braces', () => {
            assert.equal(transform('<div children=<span/> />'), 'newVNode(9, "div", null, newVNode(17, "span"));')
        })

        it('Should use a JSX fragment children prop given without braces', () => {
            assert.equal(transform('<div children=<>{a}</> />'), 'newVNode(9, "div", null, newFragment(256, a));')
        })

        it('Should trust $HasVNodeChildren for a children prop expression', () => {
            assert.equal(transform('<div $HasVNodeChildren children={a} />'), 'newVNode(9, "div", null, a);')
        })

        it('Should normalize a Fragment children prop like Fragment children', () => {
            assert.equal(transform('<Fragment children={a} />'), 'newFragment(256, a);')
        })

        it('Should normalize a JSX Fragment children prop', () => {
            assert.equal(transform('<Fragment children={<span/>} />'), 'newFragment(256, newVNode(17, "span"));')
        })
    })

    describe('current behaviour (questionable)', () => {
        it('Should mark an element with only a comment child as UnknownChildren', () => {
            assert.equal(transform('<div>{/* comment */}</div>'), 'newVNode(1, "div");')
        })

        it('Should mark an element with an empty expression as UnknownChildren', () => {
            assert.equal(transform('<div>{}</div>'), 'newVNode(1, "div");')
        })

        it('Should wrap text next to a comment in newTextVNode with UnknownChildren', () => {
            assert.equal(transform('<div>{/* c */}text</div>'), 'newVNode(1, "div", null, newTextVNode("text"));')
        })

        it('Should mark static siblings around a comment as UnknownChildren', () => {
            assert.equal(transform('<div><span/>{/* c */}<span/></div>'), 'newVNode(1, "div", null, [newVNode(17, "span"), newVNode(17, "span")]);')
        })
    })
})
