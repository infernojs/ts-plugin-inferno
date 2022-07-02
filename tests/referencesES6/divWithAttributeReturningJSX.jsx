import { createVNode } from "inferno";
createVNode(1, "div", null, null, 1, { "foo": () => (createVNode(1, "div", null, null, 1, { "bar": true })) });
