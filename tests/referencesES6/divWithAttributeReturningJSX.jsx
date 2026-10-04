import { newVNode } from "inferno";
newVNode(17, "div", null, null, { "foo": () => (newVNode(17, "div", null, null, { "bar": true })) });
