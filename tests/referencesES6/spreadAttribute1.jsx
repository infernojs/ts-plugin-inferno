import { newVNode, normalizeProps } from "inferno";
normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, { "foo": "bar" })));
