import { newVNode, normalizeProps } from "inferno";
normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, other, { "foo": "bar", "foo2": "bar2" }, more, { "foo3": "bar3" })));
