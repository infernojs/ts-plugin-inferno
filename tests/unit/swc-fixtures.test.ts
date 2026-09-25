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
);`), `import { createFragment, createVNode } from "inferno";
const App = (createVNode(1, "div", null, [createVNode(1, "div"), createFragment([createVNode(1, "div", null, "hoge", 16, null, 1)], 4)], 4));`)
        })

        it('jsxdev-args-with-fragment', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`), `import { createFragment, createVNode } from "inferno";
var x = (createFragment([createVNode(1, "div", null, "hoge", 16), createVNode(1, "div", null, "fuga", 16)], 4));`)
        })

        it('jsxdev-fragment', () => {
            assert.equal(transformWith(`const App = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`), `import { createFragment, createVNode } from "inferno";
const App = (createFragment([createVNode(1, "div", null, "hoge", 16), createVNode(1, "div", null, "fuga", 16)], 4));`)
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
);`), `import { createFragment, createVNode } from "inferno";
/**@jsxRuntime automatic */
const App = (createVNode(1, "div", null, [createVNode(1, "div"), createFragment([createVNode(1, "div", null, "hoge", 16)], 4)], 4));`)
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
);`), `import { createVNode, createComponentVNode } from "inferno";
import _JSXStyle from "styled-jsx/style";
const WithSidebar = ({ right = false, top = false, sidebar, sidebarWidth = 230, hideOnMobile = false, breakpoint = 730, children, }) => (createVNode(1, "main", _JSXStyle.dynamic([
    [
        "4507deac72c40d6c",
        [
            right ? "row-reverse" : "row",
            sidebarWidth,
            breakpoint,
            top ? "column" : "column-reverse",
        ],
    ],
]), [createComponentVNode(2, Sidebar, { "width": sidebarWidth, "right": right, "hide": hideOnMobile, "breakpoint": breakpoint, "children": sidebar }), createVNode(1, "div", _JSXStyle.dynamic([
        [
            "4507deac72c40d6c",
            [
                right ? "row-reverse" : "row",
                sidebarWidth,
                breakpoint,
                top ? "column" : "column-reverse",
            ],
        ],
    ]), children, 0), createComponentVNode(2, _JSXStyle, { "id": "4507deac72c40d6c", "dynamic": [
            right ? "row-reverse" : "row",
            sidebarWidth,
            breakpoint,
            top ? "column" : "column-reverse",
        ], "children": \`main.__jsx-style-dynamic-selector{display:-webkit-box;display:-webkit-flex;display:-moz-box;display:-ms-flexbox;display:flex;-webkit-flex-direction:\${right ? "row-reverse" : "row"};-ms-flex-direction:\${right ? "row-reverse" : "row"};flex-direction:\${right ? "row-reverse" : "row"};-webkit-box-pack:justify;-webkit-justify-content:space-between;-moz-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin-bottom:var(--geist-gap-double)}div.__jsx-style-dynamic-selector{width:100%;max-width:-webkit-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:-moz-calc(100% - \${sidebarWidth}px - var(--geist-gap-double));max-width:calc(100% - \${sidebarWidth}px - var(--geist-gap-double))}@media(max-width:\${breakpoint}px){main.__jsx-style-dynamic-selector{-webkit-flex-direction:\${top ? "column" : "column-reverse"};-ms-flex-direction:\${top ? "column" : "column-reverse"};flex-direction:\${top ? "column" : "column-reverse"}}div.__jsx-style-dynamic-selector{max-width:unset}}\` })], 4));`)
        })

        it('issue-1446', () => {
            assert.equal(transformWith(`<>
    <span>Hello something long to not trigger line break</span>
    &nbsp;
</>;`), `import { createFragment, createVNode, createTextVNode } from "inferno";
createFragment([createVNode(1, "span", null, "Hello something long to not trigger line break", 16), createTextVNode("\\u00A0")], 4);`)
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

Foo.displayName = "Foo";`), `import { createVNode } from "inferno";
export default function Foo() {
    return (createVNode(1, "div", null, null, 1, { "onClick": async (e) => {
            await doSomething();
        } }));
}
Foo.displayName = "Foo";`)
        })

        it('issue-1933', () => {
            assert.equal(transformWith(`/* @jsxImportSource react */
const p = () => <div>Hello World</div>;`), `import { createVNode } from "inferno";
/* @jsxImportSource react */
const p = () => createVNode(1, "div", null, "Hello World", 16);`)
        })

        it('issue-2037', () => {
            assert.equal(transformWith(`const A = () => {
    return <div>{...[]}</div>;
};`), `import { createVNode } from "inferno";
const A = () => {
    return createVNode(1, "div", null, [...[]], 0);
};`)
        })

        it('issue-2177', () => {
            assert.equal(transformWith(`export var App = function () {
    return (
        <>
            <div>1</div>
        </>
    );
};`), `import { createFragment, createVNode } from "inferno";
export var App = function () {
    return (createFragment([createVNode(1, "div", null, "1", 16)], 4));
};`)
        })

        it('issue-299/1', () => {
            assert.equal(transformWith(`<Page num="\\\\ ">ABC</Page>;`), `import { createComponentVNode } from "inferno";
createComponentVNode(2, Page, { "num": "\\\\\\\\ ", "children": "ABC" });`)
        })

        it('issue-299/2', () => {
            assert.equal(transformWith(`<Page num="\\\\\\\\">ABC</Page>;`), `import { createComponentVNode } from "inferno";
createComponentVNode(2, Page, { "num": "\\\\\\\\\\\\\\\\", "children": "ABC" });`)
        })

        it('issue-4070', () => {
            assert.equal(transformWith(`const ChildrenFail = (props) => {
    return array.map((label) => (
        <WrapperWhereMagicHappens {...props} key={label}>
            <h2>{label}</h2>
            {/*<div>{console.log(props.children) || props.children}</div>*/}
        </WrapperWhereMagicHappens>
    ));
};`), `import { createVNode, createComponentVNode, normalizeProps } from "inferno";
const ChildrenFail = (props) => {
    return array.map((label) => (normalizeProps(createComponentVNode(2, WrapperWhereMagicHappens, Object.assign({}, props, { "children": createVNode(1, "h2", null, label, 0) }), label))));
};`)
        })

        it('issue-4703/1', () => {
            assert.equal(transformWith(`/** @jsx foo */

function ProductItem() {
    return <div>Hello World</div>;
}

console.log(ProductItem);`), `import { createVNode } from "inferno";
/** @jsx foo */
function ProductItem() {
    return createVNode(1, "div", null, "Hello World", 16);
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
}`), `import { createVNode, createComponentVNode } from "inferno";
import Inferno from "inferno";
import { Button, Input } from "antd";
import Child from "./component/Child";
class Page extends Inferno.Component {
    render() {
        return (createVNode(1, "div", "test", [createVNode(1, "div", null, "Page", 16), createComponentVNode(2, Child), createVNode(64, "input", null, null, 1, { "placeholder": "\\u6211\\u662F\\u8C01?" }), createComponentVNode(2, Button, { "children": "click me" }), createComponentVNode(2, Input)], 4));
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
}`), `import { createFragment, createVNode } from "inferno";
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
    return (createFragment([createVNode(1, "div", null, null, 1, { "dangerouslySetInnerHTML": {
                __html: props.data.markup.content,
            } })], 4));
}`)
        })

        it('issue-5099/2', () => {
            assert.equal(transformWith(`/** @jsxRuntime typo */

<></>;`), `import { createFragment } from "inferno";
/** @jsxRuntime typo */
createFragment();`)
        })

        it('issue-5099/empty-pragma', () => {
            assert.equal(transformWith(`/** @jsxRuntime */
/** @jsxImportSource */
/** @jsxFrag */
/** @jsx */

<></>;`), `import { createFragment } from "inferno";
/** @jsxRuntime */
/** @jsxImportSource */
/** @jsxFrag */
/** @jsx */
createFragment();`)
        })

        it('issue-6931', () => {
            assert.equal(transformWith(`const f1 = <Component on={"    "} />
const f2 = <Component on="    " />`), `import { createComponentVNode } from "inferno";
const f1 = createComponentVNode(2, Component, { "on": "    " });
const f2 = createComponentVNode(2, Component, { "on": "    " });`)
        })

        it('issue-6939', () => {
            expectThrows(() => transform('const test = <div key></div>'), 'file.tsx(1,19): Please provide an explicit key value. Using "key" as a shorthand for "key={true}" is not allowed.')
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
/>`), `import { createComponentVNode } from "inferno";
createComponentVNode(2, TimelineInfiniteScrollerItem, { "ev": ev, "itemRef": itemRef, "isExternal": isExternal, "shouldRing": shouldRing, "onEventClick": onEventClick, "currentIssueRef": this._currentIssueRef }, itemKey);`)
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
);`), `import { createFragment, createVNode, normalizeProps } from "inferno";
var x = (createFragment([createVNode(1, "div", null, [createVNode(1, "div", null, null, 1, null, "1"), createVNode(1, "div", null, null, 1, { "meow": "wolf" }, "2"), createVNode(1, "div", null, null, 1, null, "3"), normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props), "4"))], 8)], 4));`)
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
};`), `import { createVNode } from "inferno";
const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return createVNode(1, "div");
            }
            return createVNode(1, "span");
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
);`), `import { createVNode } from "inferno";
/** @jsxImportSource baz */
var x = (createVNode(1, "div", null, createVNode(1, "span"), 2));`)
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
);`), `import { createVNode, normalizeProps } from "inferno";
import * as inferno from "inferno";
var y = inferno.createElement("div", { foo: 1 });
var x = (createVNode(1, "div", null, [createVNode(1, "div", null, null, 1, null, "1"), createVNode(1, "div", null, null, 1, { "meow": "wolf" }, "2"), createVNode(1, "div", null, null, 1, null, "3"), normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props), "4"))], 8));`)
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
            assert.equal(transformWith(`<Comp children={bar} />`), `import { createComponentVNode } from "inferno";
createComponentVNode(2, Comp, { "children": bar });`)
        })

        it('inferno/children-2', () => {
            assert.equal(transformWith(`<Comp children={<div>1</div>} />`), `import { createVNode, createComponentVNode } from "inferno";
createComponentVNode(2, Comp, { "children": createVNode(1, "div", null, "1", 16) });`)
        })

        it('inferno/children-3', () => {
            assert.equal(transformWith(`<Comp children={bar}><div/></Comp>`), `import { createVNode, createComponentVNode } from "inferno";
createComponentVNode(2, Comp, { "children": createVNode(1, "div") });`)
        })

        it('inferno/element-children-1', () => {
            assert.equal(transformWith(`<div children={bar} />`), `import { createVNode } from "inferno";
createVNode(1, "div", null, bar, 0);`)
        })

        it('inferno/element-children-2', () => {
            assert.equal(transformWith(`<div children={<div>1</div>} />`), `import { createVNode } from "inferno";
createVNode(1, "div", null, createVNode(1, "div", null, "1", 16), 2);`)
        })

        it('inferno/element-children-3', () => {
            assert.equal(transformWith(`<div children={bar}><div/></div>`), `import { createVNode } from "inferno";
createVNode(1, "div", null, createVNode(1, "div"), 2);`)
        })
    })

    describe('tests/jsx/fixture/react-automatic', () => {
        it('react-automatic/handle-fragments-with-key', () => {
            assert.equal(transformWith(`import * as React from "inferno";

var x = <Inferno.Fragment key="foo"></Inferno.Fragment>;`), `import { createFragment } from "inferno";
import * as React from "inferno";
var x = createFragment(null, 1, "foo");`)
        })

        it('react-automatic/handle-fragments-with-no-children', () => {
            assert.equal(transformWith(`var x = <></>;`), `import { createFragment } from "inferno";
var x = createFragment();`)
        })

        it('react-automatic/handle-fragments', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div />
    </>
);`), `import { createFragment, createVNode } from "inferno";
var x = (createFragment([createVNode(1, "div")], 4));`)
        })

        it('react-automatic/handle-nonstatic-children', () => {
            assert.equal(transformWith(`var x = <div>{[<span key={"0"} />, <span key={"1"} />]}</div>;`), `import { createVNode } from "inferno";
var x = createVNode(1, "div", null, [createVNode(1, "span", null, null, 1, null, "0"), createVNode(1, "span", null, null, 1, null, "1")], 0);`)
        })

        it('react-automatic/handle-static-children', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <span />
        {[<span key={"0"} />, <span key={"1"} />]}
    </div>
);`), `import { createVNode } from "inferno";
var x = (createVNode(1, "div", null, [createVNode(1, "span"), [createVNode(1, "span", null, null, 1, null, "0"), createVNode(1, "span", null, null, 1, null, "1")]], 0));`)
        })

        it('react-automatic/key-undefined-works', () => {
            assert.equal(transformWith(`const props = { foo: true };
var x = <div {...props} key={undefined}></div>;`), `import { createVNode, normalizeProps } from "inferno";
const props = { foo: true };
var x = normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props), undefined));`)
        })

        it('react-automatic/pragma-works-with-no-space-at-the-end', () => {
            assert.equal(transformWith(`/* @jsxImportSource foo*/
<div>Hi</div>;`), `import { createVNode } from "inferno";
/* @jsxImportSource foo*/
createVNode(1, "div", null, "Hi", 16);`)
        })

        it('react-automatic/should-properly-handle-keys', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <div key="1" />
        <div key="2" meow="wolf" />
        <div key="3" />
    </div>
);`), `import { createVNode } from "inferno";
var x = (createVNode(1, "div", null, [createVNode(1, "div", null, null, 1, null, "1"), createVNode(1, "div", null, null, 1, { "meow": "wolf" }, "2"), createVNode(1, "div", null, null, 1, null, "3")], 8));`)
        })

        it('react-automatic/should-properly-handle-null-prop-spread', () => {
            assert.equal(transformWith(`var foo = null;
var x = <div {...foo} />;`), `import { createVNode, normalizeProps } from "inferno";
var foo = null;
var x = normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, foo)));`)
        })

        it('react-automatic/should-use-createElement-when-key-comes-after-spread', () => {
            assert.equal(transformWith(`var x = <div {...props} key="1" foo="bar" />;`), `import { createVNode, normalizeProps } from "inferno";
var x = normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props, { "foo": "bar" }), "1"));`)
        })

        it('react-automatic/should-use-jsx-when-key-comes-before-spread', () => {
            assert.equal(transformWith(`var x = <div key="1" {...props} foo="bar" />;`), `import { createVNode, normalizeProps } from "inferno";
var x = normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props, { "foo": "bar" }), "1"));`)
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
);`), `import { createVNode, createComponentVNode } from "inferno";
/** @jsx dom */
createComponentVNode(2, Foo);
var profile = (createVNode(1, "div", null, [createVNode(1, "img", "profile", null, 1, { "src": "avatar.png" }), createVNode(1, "h3", null, [user.firstName, user.lastName].join(" "), 0)], 4));`)
        })

        it('react/honor-custom-jsx-pragma-option', () => {
            assert.equal(transformWith(`<Foo></Foo>;

var profile = (
    <div>
        <img src="avatar.png" className="profile" />
        <h3>{[user.firstName, user.lastName].join(" ")}</h3>
    </div>
);`), `import { createVNode, createComponentVNode } from "inferno";
createComponentVNode(2, Foo);
var profile = (createVNode(1, "div", null, [createVNode(1, "img", "profile", null, 1, { "src": "avatar.png" }), createVNode(1, "h3", null, [user.firstName, user.lastName].join(" "), 0)], 4));`)
        })

        it('react/pragma-works-with-no-space-at-the-end', () => {
            assert.equal(transformWith(`/* @jsx foo*/
<div>Hi</div>;`), `import { createVNode } from "inferno";
/* @jsx foo*/
createVNode(1, "div", null, "Hi", 16);`)
        })

        it('react/should-allow-multiple-pragmas-per-line', () => {
            assert.equal(transformWith(`/* @jsxRuntime automatic @jsxImportSource preact */

var div = <div>test</div>;`), `import { createVNode } from "inferno";
/* @jsxRuntime automatic @jsxImportSource preact */
var div = createVNode(1, "div", null, "test", 16);`)
        })
    })

    describe('tests/jsx/fixture/regression', () => {
        it('regression/pragma-frag-set-default-classic-runtime', () => {
            assert.equal(transformWith(`/* @jsxFrag Inferno.Fragment */
/* @jsx h */
<>Test</>;`), `import { createFragment, createTextVNode } from "inferno";
/* @jsxFrag Inferno.Fragment */
/* @jsx h */
createFragment([createTextVNode("Test")], 4);`)
        })
    })

    describe('tests/jsx/fixture/runtime', () => {
        it('runtime/classic, runtime/defaults-to-classis-babel-7', () => {
            assert.equal(transformWith(`var x = (
    <div>
        <span />
    </div>
);`), `import { createVNode } from "inferno";
var x = (createVNode(1, "div", null, createVNode(1, "span"), 2));`)
        })

        it('runtime/pragma-runtime-classsic', () => {
            assert.equal(transformWith(`/** @jsxRuntime classic */

var x = (
    <div>
        <span />
    </div>
);`), `import { createVNode } from "inferno";
/** @jsxRuntime classic */
var x = (createVNode(1, "div", null, createVNode(1, "span"), 2));`)
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
);`), `import { createComponentVNode } from "inferno";
export default (createComponentVNode(2, A, { "className": b, "header": "C", "subheader": "D E" }));`)
        })

        it('vercel/2', () => {
            assert.equal(transformWith(`export default () => {
    return <Input pattern=".*\\S+.*" />;
};`), `import { createComponentVNode } from "inferno";
export default () => {
    return createComponentVNode(2, Input, { "pattern": ".*\\\\S+.*" });
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
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
const App = (createVNode(1, "div", null, [createVNode(1, "div"), createFragment([createVNode(1, "div", null, "hoge", 16, null, 1)], 4)], 4));`)
        })

        it('integration/jsxdev-args-with-fragment', () => {
            assert.equal(transformWith(`var x = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`, commonJS), `var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
var x = (createFragment([createVNode(1, "div", null, "hoge", 16), createVNode(1, "div", null, "fuga", 16)], 4));`)
        })

        it('integration/jsxdev-fragment', () => {
            assert.equal(transformWith(`const App = (
    <>
        <div>hoge</div>
        <div>fuga</div>
    </>
);`, commonJS), `var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
const App = (createFragment([createVNode(1, "div", null, "hoge", 16), createVNode(1, "div", null, "fuga", 16)], 4));`)
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
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
/**@jsxRuntime automatic */
const App = (createVNode(1, "div", null, [createVNode(1, "div"), createFragment([createVNode(1, "div", null, "hoge", 16)], 4)], 4));`)
        })

        it('jsx/fixture/autoImport/after-polyfills-script', () => {
            assert.equal(transformWith(`// https://github.com/babel/babel/issues/12522

require("app-polyfill/ie11");
require("app-polyfill/stable");
const Inferno = require("inferno");

Inferno.render(<p>Hello, World!</p>, document.getElementById("root"));`, commonJS), `var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
// https://github.com/babel/babel/issues/12522
require("app-polyfill/ie11");
require("app-polyfill/stable");
const Inferno = require("inferno");
Inferno.render(createVNode(1, "p", null, "Hello, World!", 16), document.getElementById("root"));`)
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
var normalizeProps = $inferno.normalizeProps;
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
var x = (createFragment([createVNode(1, "div", null, [createVNode(1, "div", null, null, 1, null, "1"), createVNode(1, "div", null, null, 1, { "meow": "wolf" }, "2"), createVNode(1, "div", null, null, 1, null, "3"), normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props), "4"))], 8)], 4));`)
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
var createVNode = $inferno.createVNode;
const Bar = () => {
    const Foo = () => {
        const Component = ({ thing, ..._react }) => {
            if (!thing) {
                var _react2 = "something useless";
                var b = _react3();
                var c = _react5();
                var jsx = 1;
                var _jsx = 2;
                return createVNode(1, "div");
            }
            return createVNode(1, "span");
        };
    };
};`)
        })
    })
})
