import { createVNode, createComponentVNode, createTextVNode } from "inferno";
createVNode(1, "div", null, [createComponentVNode(2, FooBar), createTextVNode("foobar")], 4);
