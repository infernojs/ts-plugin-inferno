import { createVNode, normalizeProps } from "inferno";
normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, this.props, { "foo": "bar" })));
