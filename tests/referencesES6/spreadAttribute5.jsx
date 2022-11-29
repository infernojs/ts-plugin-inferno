import { createVNode, normalizeProps } from "inferno";
normalizeProps(createVNode(1, "div", "test", null, 1, Object.assign({}, { "foo": "bar" }, props)));
