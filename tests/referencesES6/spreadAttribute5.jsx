import { newVNode, normalizeProps } from "inferno";
normalizeProps(newVNode(17, "div", "test", null, Object.assign({}, { "foo": "bar" }, props)));
