import { createVNode, normalizeProps } from "inferno";
normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props, other, { "foo": "bar", "foo2": "bar2" }, more, { "foo3": "bar3" })));
