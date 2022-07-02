import { createVNode, createComponentVNode } from "inferno";
createVNode(1, "div", null, [createComponentVNode(2, FooBar, null, "foo"), createVNode(1, "div", null, "1", 16, null, "1")], 8);
