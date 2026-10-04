// Cases from swc-plugin-inferno's tests/jsx, tests/integration and tests/script fixtures that had no test here.
// Titles are the fixture paths, identical inputs share a test. swc's expected outputs were compared after normalizing
// pure annotations, formatting and quoted keys; the TypeScript output is pinned. Fixtures of swc-only options
// (importSource, pure annotations) and the ones already covered, e.g. by babel-parity.test.ts, are left out.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import * as ts from 'typescript'
import {commonJS, expectThrows, transform, transformWith} from './helpers'

// The first syntax error TypeScript reports for the input, as "(line,column): message"
function firstDiagnostic(input: string): string {
    const result = ts.transpileModule(input, {fileName: 'file.jsx', reportDiagnostics: true, compilerOptions: {jsx: ts.JsxEmit.Preserve}})
    const diagnostic = result.diagnostics[0]
    const sourceFile = ts.createSourceFile('file.jsx', input, ts.ScriptTarget.Latest)
    const {line, character} = sourceFile.getLineAndCharacterOfPosition(diagnostic.start)

    return `(${line + 1},${character + 1}): ` + ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
}

describe('swc-plugin-inferno fixtures', () => {
    // The development option of some of these fixtures only enables swc's fast refresh, the output is the same
    describe('tests/integration/fixture', () => {
        it('jsx-dev-transform, jsx-transform', () => {
            assert.equal(transformWith(`const App = (
    <div>
        <div />
        <>
            <div key={1}>hoge</div>
        </>
    </div>
);`), `import { newVNode, newFragment } from "inferno";
const App = (newVNode(5, "div", null, [newVNode(17, "div"), newFragment(260, [newVNode(3, "div", null, "hoge", null, 1)])]));`)
        })

        it('jsxdev-args-with-fragment', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`), `import { newVNode, newFragment } from "inferno";
var x = (newFragment(260, [newVNode(3, "div", null, "hoge"), newVNode(3, "div", null, "fuga")]));`)
        })

        it('jsxdev-fragment', () => {
            assert.equal(transformWith(`const App = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`), `import { newVNode, newFragment } from "inferno";
const App = (newFragment(260, [newVNode(3, "div", null, "hoge"), newVNode(3, "div", null, "fuga")]));`)
        })

        it('with-pragma', () => {
            assert.equal(transformWith(`/**@jsxRuntime automatic */
const App = (
    <div>
        <div />
        <>
            <div>hoge</div>
        </>
    </div>
);`), `import { newVNode, newFragment } from "inferno";
/**@jsxRuntime automatic */
const App = (newVNode(5, "div", null, [newVNode(17, "div"), newFragment(260, [newVNode(3, "div", null, "hoge")])]));`)
        })
    })

    describe('tests/jsx/fixture', () => {
        it('3', () => {
            assert.equal(transformWith(`import _JSXStyle from "styled-jsx/style";
const WithSidebar = ({
    right = false,
    top = false,
    sidebar,
    sidebarWidth = 230,
    hideOnMobile = false,
    breakpoint = 730,
    children,
}) => (
    <main
        className={_JSXStyle.dynamic([
            [
                "4507deac72c40d6c",
                [
                    right ? "row-reverse" : "row",
                    sidebarWidth,
                    breakpoint,
                    top ? "column" : "column-reverse",
                ],
            ],
        ])}
    >
        <Sidebar
            width={sidebarWidth}
            right={right}
            hide={hideOnMobile}
            breakpoint={breakpoint}
        >
            {sidebar}
        </Sidebar>

        <div
            className={_JSXStyle.dynamic([
                [
                    "4507deac72c40d6c",
                    [
                        right ? "row-reverse" : "row",
                        sidebarWidth,
                        breakpoint,
                        top ? "column" : "column-reverse",
                    ],
                ],
            ])}
        >
            {children}
        </div>

        <_JSXStyle
            id={"4507deac72c40d6c"}
            dynamic={[
                right ? "row-reverse" : "row",
                sidebarWidth,
                breakpoint,
                top ? "column" : "column-reverse",
            ]}
        >{\`main.__jsx-style-dynamic-selector{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-direction:\${
            right ? "row-reverse" : "row"
        };-ms-flex-direction:\${right ? "row-reverse" : "row"};flex-direction:\${
            right ? "row-reverse" : "row"
        };-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin-bottom:var(--geist-gap-double)}div.__jsx-style-dynamic-selector{width:100%;max-width:-webkit-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:-moz-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:calc(100% - \${sidebarWidth}px - var(--geist-gap-double))}@media(max-width:\${breakpoint}px){main.__jsx-style-dynamic-selector{-webkit-flex-direction:\${
            top ? "column" : "column-reverse"
        };-ms-flex-direction:\${
            top ? "column" : "column-reverse"
        };flex-direction:\${
            top ? "column" : "column-reverse"
        }}div.__jsx-style-dynamic-selector{max-width:unset}}\`}</_JSXStyle>
    </main>
);`), `import { newVNode, newComponentVNode } from "inferno";
import _JSXStyle from "styled-jsx/style";
const WithSidebar = ({ right = false, top = false, sidebar, sidebarWidth = 230, hideOnMobile = false, breakpoint = 730, children, }) => (newVNode(5, "main", _JSXStyle.dynamic([
    [
        "4507deac72c40d6c",
        [
            right ? "row-reverse" : "row",
            sidebarWidth,
            breakpoint,
            top ? "column" : "column-reverse",
        ],
    ],
]), [newComponentVNode(0, Sidebar, { "width": sidebarWidth, "right": right, "hide": hideOnMobile, "breakpoint": breakpoint, "children": sidebar }), newVNode(1, "div", _JSXStyle.dynamic([
        [
            "4507deac72c40d6c",
            [
                right ? "row-reverse" : "row",
                sidebarWidth,
                breakpoint,
                top ? "column" : "column-reverse",
            ],
        ],
    ]), children), newComponentVNode(0, _JSXStyle, { "id": "4507deac72c40d6c", "dynamic": [
            right ? "row-reverse" : "row",
            sidebarWidth,
            breakpoint,
            top ? "column" : "column-reverse",
        ], "children": \`main.__jsx-style-dynamic-selector{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-direction:\${right ? "row-reverse" : "row"};-ms-flex-direction:\${right ? "row-reverse" : "row"};flex-direction:\${right ? "row-reverse" : "row"};-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin-bottom:var(--geist-gap-double)}div.__jsx-style-dynamic-selector{width:100%;max-width:-webkit-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:-moz-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:calc(100% - \${sidebarWidth}px - var(--geist-gap-double))}@media(max-width:\${breakpoint}px){main.__jsx-style-dynamic-selector{-webkit-flex-direction:\${top ? "column" : "column-reverse"};-ms-flex-direction:\${top ? "column" : "column-reverse"};flex-direction:\${top ? "column" : "column-reverse"}}div.__jsx-style-dynamic-selector{max-width:unset}}\` })]));`)
        })

        it('issue-1446', () => {
            assert.equal(transformWith(`<>
    <span>Hello something long to not trigger line break</span>
    &nbsp;
</>;`), `import { newVNode, newFragment, newTextVNode } from "inferno";
newFragment(260, [newVNode(3, "span", null, "Hello something long to not trigger line break"), newTextVNode("\\u00A0")]);`)
        })

        // TypeScript elides the unused Inferno import, swc keeps it
        it('issue-1799/case1', () => {
            assert.equal(transformWith(`// Foo.jsx
import Inferno from "inferno";

export default function Foo() {
    return (
        <div
            onClick={async (e) => {
                await doSomething();
            }}
        ></div>
    );
}

Foo.displayName = "Foo";`), `import { newVNode } from "inferno";
export default function Foo() {
    return (newVNode(17, "div", null, null, { "onClick": async (e) => {
            await doSomething();
        } }));
}
Foo.displayName = "Foo";`)
        })

        it('issue-1933', () => {
            assert.equal(transformWith(`/* @jsxImportSource react */
const p = () => <div>Hello World</div>;`), `import { newVNode } from "inferno";
/* @jsxImportSource react */
const p = () => newVNode(3, "div", null, "Hello World");`)
        })

        it('issue-2037', () => {
            assert.equal(transformWith(`const A = () => {
    return <div>{...[]}</div>;
};`), `import { newVNode } from "inferno";
const A = () => {
    return newVNode(1, "div", null, [...[]]);
};`)
        })

        it('issue-2177', () => {
            assert.equal(transformWith(`export var App = function () {
    return (
        <>
            <div>1</div>
        </>
    );
};`), `import { newVNode, newFragment } from "inferno";
export var App = function () {
    return (newFragment(260, [newVNode(3, "div", null, "1")]));
};`)
        })

        it('issue-299/1', () => {
            assert.equal(transformWith(`<Page num="\\\\ ">ABC</Page>;`), `import { newComponentVNode } from "inferno";
newComponentVNode(0, Page, { "num": "\\\\\\\\ ", "children": "ABC" });`)
        })

        it('issue-299/2', () => {
            assert.equal(transformWith(`<Page num="\\\\\\\\">ABC</Page>;`), `import { newComponentVNode } from "inferno";
newComponentVNode(0, Page, { "num": "\\\\\\\\\\\\\\\\", "children": "ABC" });`)
        })

        it('issue-4070', () => {
            assert.equal(transformWith(`const ChildrenFail = (props) => {
    return array.map((label) => (
        <WrapperWhereMagicHappens {...props} key={label}>
            <h2>{label}</h2>
            {/*<div>{console.log(props.children) || props.children}</div>*/}
        </WrapperWhereMagicHappens>
    ));
};`), `import { newVNode, newComponentVNode, normalizeProps } from "inferno";
const ChildrenFail = (props) => {
    return array.map((label) => (normalizeProps(newComponentVNode(0, WrapperWhereMagicHappens, Object.assign({}, props, { "children": newVNode(1, "h2", null, label) }), label))));
};`)
        })

        it('issue-4703/1', () => {
            assert.equal(transformWith(`/** @jsx foo */

function ProductItem() {
    return <div>Hello World</div>;
}

console.log(ProductItem);`), `import { newVNode } from "inferno";
/** @jsx foo */
function ProductItem() {
    return newVNode(3, "div", null, "Hello World");
}
console.log(ProductItem);`)
        })

        // TypeScript emits the duplicated Inferno import once, swc keeps both
        it('issue-5072', () => {
            assert.equal(transformWith(`import Inferno from "inferno";
import Inferno from "inferno";
import { Button, Input } from "antd";
import Child from "./component/Child";

class Page extends Inferno.Component {
    render() {
        return (
            <div className={"test"}>
                <div>Page</div>
                <Child />
                <input placeholder="我是谁?" />
                <Button>click me</Button>
                <Input />
            </div>
        );
    }
}`), `import { newVNode, newComponentVNode } from "inferno";
import Inferno from "inferno";
import { Button, Input } from "antd";
import Child from "./component/Child";
class Page extends Inferno.Component {
    render() {
        return (newVNode(5, "div", "test", [newVNode(3, "div", null, "Page"), newComponentVNode(0, Child), newVNode(528, "input", null, null, { "placeholder": "\\u6211\\u662F\\u8C01?" }), newComponentVNode(0, Button, { "children": "click me" }), newComponentVNode(0, Input)]));
    }
}`)
        })

        it('issue-5099/1', () => {
            assert.equal(transformWith(`/** @jsx h */
/** @jsxFrag */
import { h } from "preact";

import { Marked } from "markdown";

export const handler = {
    async GET(req, ctx) {
        const markdown = await Deno.readTextFile(\`posts/\${ctx.params.id}.md\`);
        const markup = Marked.parse(markdown);
        const resp = await ctx.render({ markup });
        return resp;
    },
};

export default function Greet(props) {
    return (
        <>
            <div
                dangerouslySetInnerHTML={{
                    __html: props.data.markup.content,
                }}
            />
        </>
    );
}`), `import { newVNode, newFragment } from "inferno";
/** @jsx h */
/** @jsxFrag */
import { h } from "preact";
import { Marked } from "markdown";
export const handler = {
    async GET(req, ctx) {
        const markdown = await Deno.readTextFile(\`posts/\${ctx.params.id}.md\`);
        const markup = Marked.parse(markdown);
        const resp = await ctx.render({ markup });
        return resp;
    },
};
export default function Greet(props) {
    return (newFragment(260, [newVNode(17, "div", null, null, { "dangerouslySetInnerHTML": {
                __html: props.data.markup.content,
            } })]));
}`)
        })

        it('issue-5099/2', () => {
            assert.equal(transformWith(`/** @jsxRuntime typo */

<></>;`), `import { newFragment } from "inferno";
/** @jsxRuntime typo */
newFragment(272);`)
        })

        it('issue-5099/empty-pragma', () => {
            assert.equal(transformWith(`/** @jsxRuntime */
/** @jsxImportSource */
/** @jsxFrag */
/** @jsx */

<></>;`), `import { newFragment } from "inferno";
/** @jsxRuntime */
/** @jsxImportSource */
/** @jsxFrag */
/** @jsx */
newFragment(272);`)
        })

        it('issue-6931', () => {
            assert.equal(transformWith(`const f1 = <Component on={"    "} />
const f2 = <Component on="    " />`), `import { newComponentVNode } from "inferno";
const f1 = newComponentVNode(0, Component, { "on": "    " });
const f2 = newComponentVNode(0, Component, { "on": "    " });`)
        })

        it('issue-6939', () => {
            expectThrows(() => transform('const test = <div key></div>'), 'file.tsx(1,19): Please provide an explicit key value. Using "key" as a shorthand for "key={true}" is not allowed.\n> 1 | const test = <div key></div>\n    |                   ^^^')
        })

        // A spread in an attribute value is a syntax error, TypeScript reports it at the same position as swc
        it('issue-6977/1', () => {
            assert.equal(firstDiagnostic('function Component(props) {\n}\n\n<Component x={...[1,2,3]} />'), '(4,15): Expression expected.')
        })

        it('issue-6977/2', () => {
            assert.equal(firstDiagnostic('function Component(props) {\n}\n\n<Component x={...{a: x}} />'), '(4,15): Expression expected.')
        })

        it('refprop_test', () => {
            assert.equal(transformWith(`<TimelineInfiniteScrollerItem
    key={itemKey}
    ev={ev}
    itemRef={itemRef}
    isExternal={isExternal}
    shouldRing={shouldRing}
    onEventClick={onEventClick}
    currentIssueRef={this._currentIssueRef}
/>`), `import { newComponentVNode } from "inferno";
newComponentVNode(0, TimelineInfiniteScrollerItem, { "ev": ev, "itemRef": itemRef, "isExternal": isExternal, "shouldRing": shouldRing, "onEventClick": onEventClick, "currentIssueRef": this._currentIssueRef }, itemKey);`)
        })
    })

    describe('tests/jsx/fixture/autoImport', () => {
        it('autoImport/auto-import-react-source-type-module', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>
            <div key="1" />
            <div key="2" meow="wolf" />
            <div key="3" />
            <div {...props} key="4" />
        </div>
    </>
);`), `import { newVNode, newFragment, normalizeProps } from "inferno";
var x = (newFragment(260, [newVNode(33, "div", null, [newVNode(17, "div", null, null, null, "1"), newVNode(17, "div", null, null, { "meow": "wolf" }, "2"), newVNode(17, "div", null, null, null, "3"), normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props), "4"))])]));`)
        })

        it('autoImport/complicated-scope-module', () => {
            assert.equal(transformWith(`const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return <div />;
            }
            return <span />;
        };
    };
};`), `import { newVNode } from "inferno";
const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return newVNode(17, "div");
            }
            return newVNode(17, "span");
        };
    };
};`)
        })

        it('autoImport/import-source-pragma', () => {
            assert.equal(transformWith(`/** @jsxImportSource baz */
var x = (
    <div>
        <span />
    </div>
);`), `import { newVNode } from "inferno";
/** @jsxImportSource baz */
var x = (newVNode(9, "div", null, newVNode(17, "span")));`)
        })

        it('autoImport/no-jsx', () => {
            assert.equal(transformWith(`var foo = "<div></div>";`), `var foo = "<div></div>";`)
        })

        it('autoImport/react-defined', () => {
            assert.equal(transformWith(`import * as inferno from "inferno";
var y = inferno.createElement("div", { foo: 1 });
var x = (
    <div>
        <div key="1" />
        <div key="2" meow="wolf" />
        <div key="3" />
        <div {...props} key="4" />
    </div>
);`), `import { newVNode, normalizeProps } from "inferno";
import * as inferno from "inferno";
var y = inferno.createElement("div", { foo: 1 });
var x = (newVNode(33, "div", null, [newVNode(17, "div", null, null, null, "1"), newVNode(17, "div", null, null, { "meow": "wolf" }, "2"), newVNode(17, "div", null, null, null, "3"), normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props), "4"))]));`)
        })
    })

    describe('tests/jsx/fixture/cmt', () => {
        it('cmt/1', () => {
            assert.equal(transformWith(`import Inferno from "inferno";
Inferno.createElement("div");`), `import Inferno from "inferno";
Inferno.createElement("div");`)
        })
    })

    describe('tests/jsx/fixture/inferno', () => {
        it('inferno/children-1', () => {
            assert.equal(transformWith(`<Comp children={bar} />`), `import { newComponentVNode } from "inferno";
newComponentVNode(0, Comp, { "children": bar });`)
        })

        it('inferno/children-2', () => {
            assert.equal(transformWith(`<Comp children={<div>1</div>} />`), `import { newVNode, newComponentVNode } from "inferno";
newComponentVNode(0, Comp, { "children": newVNode(3, "div", null, "1") });`)
        })

        it('inferno/children-3', () => {
            assert.equal(transformWith(`<Comp children={bar}><div/></Comp>`), `import { newVNode, newComponentVNode } from "inferno";
newComponentVNode(0, Comp, { "children": newVNode(17, "div") });`)
        })

        it('inferno/element-children-1', () => {
            assert.equal(transformWith(`<div children={bar} />`), `import { newVNode } from "inferno";
newVNode(1, "div", null, bar);`)
        })

        it('inferno/element-children-2', () => {
            assert.equal(transformWith(`<div children={<div>1</div>} />`), `import { newVNode } from "inferno";
newVNode(9, "div", null, newVNode(3, "div", null, "1"));`)
        })

        it('inferno/element-children-3', () => {
            assert.equal(transformWith(`<div children={bar}><div/></div>`), `import { newVNode } from "inferno";
newVNode(9, "div", null, newVNode(17, "div"));`)
        })
    })

    describe('tests/jsx/fixture/react-automatic', () => {
        it('react-automatic/handle-fragments-with-key', () => {
            assert.equal(transformWith(`import * as React from "inferno";

var x = <Inferno.Fragment key="foo"></Inferno.Fragment>;`), `import { newFragment } from "inferno";
import * as React from "inferno";
var x = newFragment(272, null, "foo");`)
        })

        it('react-automatic/handle-fragments-with-no-children', () => {
            assert.equal(transformWith(`var x = <></>;`), `import { newFragment } from "inferno";
var x = newFragment(272);`)
        })

        it('react-automatic/handle-fragments', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div />
    </>
);`), `import { newVNode, newFragment } from "inferno";
var x = (newFragment(260, [newVNode(17, "div")]));`)
        })

        it('react-automatic/handle-nonstatic-children', () => {
            assert.equal(transformWith(`var x = <div>{[<span key={"0"} />, <span key={"1"} />]}</div>;`), `import { newVNode } from "inferno";
var x = newVNode(1, "div", null, [newVNode(17, "span", null, null, null, "0"), newVNode(17, "span", null, null, null, "1")]);`)
        })

        it('react-automatic/handle-static-children', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <span />
        {[<span key={"0"} />, <span key={"1"} />]}
    </div>
);`), `import { newVNode } from "inferno";
var x = (newVNode(1, "div", null, [newVNode(17, "span"), [newVNode(17, "span", null, null, null, "0"), newVNode(17, "span", null, null, null, "1")]]));`)
        })

        it('react-automatic/key-undefined-works', () => {
            assert.equal(transformWith(`const props = { foo: true };
var x = <div {...props} key={undefined}></div>;`), `import { newVNode, normalizeProps } from "inferno";
const props = { foo: true };
var x = normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props), undefined));`)
        })

        it('react-automatic/pragma-works-with-no-space-at-the-end', () => {
            assert.equal(transformWith(`/* @jsxImportSource foo*/
<div>Hi</div>;`), `import { newVNode } from "inferno";
/* @jsxImportSource foo*/
newVNode(3, "div", null, "Hi");`)
        })

        it('react-automatic/should-properly-handle-keys', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <div key="1" />
        <div key="2" meow="wolf" />
        <div key="3" />
    </div>
);`), `import { newVNode } from "inferno";
var x = (newVNode(33, "div", null, [newVNode(17, "div", null, null, null, "1"), newVNode(17, "div", null, null, { "meow": "wolf" }, "2"), newVNode(17, "div", null, null, null, "3")]));`)
        })

        it('react-automatic/should-properly-handle-null-prop-spread', () => {
            assert.equal(transformWith(`var foo = null;
var x = <div {...foo} />;`), `import { newVNode, normalizeProps } from "inferno";
var foo = null;
var x = normalizeProps(newVNode(17, "div", null, null, Object.assign({}, foo)));`)
        })

        it('react-automatic/should-use-createElement-when-key-comes-after-spread', () => {
            assert.equal(transformWith(`var x = <div {...props} key="1" foo="bar" />;`), `import { newVNode, normalizeProps } from "inferno";
var x = normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, { "foo": "bar" }), "1"));`)
        })

        it('react-automatic/should-use-jsx-when-key-comes-before-spread', () => {
            assert.equal(transformWith(`var x = <div key="1" {...props} foo="bar" />;`), `import { newVNode, normalizeProps } from "inferno";
var x = normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, { "foo": "bar" }), "1"));`)
        })
    })

    // JSX pragma comments and options are React's, the plugin always compiles to Inferno's API
    describe('tests/jsx/fixture/react', () => {
        it('react/honor-custom-jsx-comment-if-jsx-pragma-option-set, react/honor-custom-jsx-comment', () => {
            assert.equal(transformWith(`/** @jsx dom */

<Foo></Foo>;

var profile = (
    <div>
        <img src="avatar.png" className="profile" />
        <h3>{[user.firstName, user.lastName].join(" ")}</h3>
    </div>
);`), `import { newVNode, newComponentVNode } from "inferno";
/** @jsx dom */
newComponentVNode(0, Foo);
var profile = (newVNode(5, "div", null, [newVNode(17, "img", "profile", null, { "src": "avatar.png" }), newVNode(1, "h3", null, [user.firstName, user.lastName].join(" "))]));`)
        })

        it('react/honor-custom-jsx-pragma-option', () => {
            assert.equal(transformWith(`<Foo></Foo>;

var profile = (
    <div>
        <img src="avatar.png" className="profile" />
        <h3>{[user.firstName, user.lastName].join(" ")}</h3>
    </div>
);`), `import { newVNode, newComponentVNode } from "inferno";
newComponentVNode(0, Foo);
var profile = (newVNode(5, "div", null, [newVNode(17, "img", "profile", null, { "src": "avatar.png" }), newVNode(1, "h3", null, [user.firstName, user.lastName].join(" "))]));`)
        })

        it('react/pragma-works-with-no-space-at-the-end', () => {
            assert.equal(transformWith(`/* @jsx foo*/
<div>Hi</div>;`), `import { newVNode } from "inferno";
/* @jsx foo*/
newVNode(3, "div", null, "Hi");`)
        })

        it('react/should-allow-multiple-pragmas-per-line', () => {
            assert.equal(transformWith(`/* @jsxRuntime automatic @jsxImportSource preact */

var div = <div>test</div>;`), `import { newVNode } from "inferno";
/* @jsxRuntime automatic @jsxImportSource preact */
var div = newVNode(3, "div", null, "test");`)
        })
    })

    describe('tests/jsx/fixture/regression', () => {
        it('regression/pragma-frag-set-default-classic-runtime', () => {
            assert.equal(transformWith(`/* @jsxFrag Inferno.Fragment */
/* @jsx h */
<>Test</>;`), `import { newFragment, newTextVNode } from "inferno";
/* @jsxFrag Inferno.Fragment */
/* @jsx h */
newFragment(260, [newTextVNode("Test")]);`)
        })
    })

    describe('tests/jsx/fixture/runtime', () => {
        it('runtime/classic, runtime/defaults-to-classis-babel-7', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <span />
    </div>
);`), `import { newVNode } from "inferno";
var x = (newVNode(9, "div", null, newVNode(17, "span")));`)
        })

        it('runtime/pragma-runtime-classsic', () => {
            assert.equal(transformWith(`/** @jsxRuntime classic */

var x = (
    <div>
        <span />
    </div>
);`), `import { newVNode } from "inferno";
/** @jsxRuntime classic */
var x = (newVNode(9, "div", null, newVNode(17, "span")));`)
        })
    })

    describe('tests/jsx/fixture/vercel', () => {
        it('vercel/1', () => {
            assert.equal(transformWith(`export default (
    <A
        className={b}
        header="C"
        subheader="D
                E"
    />
);`), `import { newComponentVNode } from "inferno";
export default (newComponentVNode(0, A, { "className": b, "header": "C", "subheader": "D E" }));`)
        })

        it('vercel/2', () => {
            assert.equal(transformWith(`export default () => {
    return <Input pattern=".*\\S+.*" />;
};`), `import { newComponentVNode } from "inferno";
export default () => {
    return newComponentVNode(0, Input, { "pattern": ".*\\\\S+.*" });
};`)
        })
    })

    // swc parses these as scripts and requires the helpers. TypeScript decides between import and require from the
    // module option, so they compile as CommonJS here
    describe('tests/script', () => {
        it('integration/jsx-dev-transform, integration/jsx-transform', () => {
            assert.equal(transformWith(`const App = (
    <div>
        <div />
        <>
            <div key={1}>hoge</div>
        </>
    </div>
);`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
const App = (newVNode(5, "div", null, [newVNode(17, "div"), newFragment(260, [newVNode(3, "div", null, "hoge", null, 1)])]));`)
        })

        it('integration/jsxdev-args-with-fragment', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
var x = (newFragment(260, [newVNode(3, "div", null, "hoge"), newVNode(3, "div", null, "fuga")]));`)
        })

        it('integration/jsxdev-fragment', () => {
            assert.equal(transformWith(`const App = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
const App = (newFragment(260, [newVNode(3, "div", null, "hoge"), newVNode(3, "div", null, "fuga")]));`)
        })

        it('integration/with-pragma', () => {
            assert.equal(transformWith(`/**@jsxRuntime automatic */
const App = (
    <div>
        <div />
        <>
            <div>hoge</div>
        </>
    </div>
);`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
/**@jsxRuntime automatic */
const App = (newVNode(5, "div", null, [newVNode(17, "div"), newFragment(260, [newVNode(3, "div", null, "hoge")])]));`)
        })

        it('jsx/fixture/autoImport/after-polyfills-script', () => {
            assert.equal(transformWith(`// https://github.com/babel/babel/issues/12522

require("app-polyfill/ie11");
require("app-polyfill/stable");
const Inferno = require("inferno");

Inferno.render(<p>Hello, World!</p>, document.getElementById("root"));`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
// https://github.com/babel/babel/issues/12522
require("app-polyfill/ie11");
require("app-polyfill/stable");
const Inferno = require("inferno");
Inferno.render(newVNode(3, "p", null, "Hello, World!"), document.getElementById("root"));`)
        })

        it('jsx/fixture/autoImport/auto-import-runtime-source-type-script', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>
            <div key="1" />
            <div key="2" meow="wolf" />
            <div key="3" />
            <div {...props} key="4" />
        </div>
    </>
);`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
var normalizeProps = $inferno.normalizeProps;
var x = (newFragment(260, [newVNode(33, "div", null, [newVNode(17, "div", null, null, null, "1"), newVNode(17, "div", null, null, { "meow": "wolf" }, "2"), newVNode(17, "div", null, null, null, "3"), normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props), "4"))])]));`)
        })

        it('jsx/fixture/autoImport/complicated-scope-script', () => {
            assert.equal(transformWith(`const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return <div />;
            }
            return <span />;
        };
    };
};`, commonJS), `var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return newVNode(17, "div");
            }
            return newVNode(17, "span");
        };
    };
};`)
        })
    })
})
