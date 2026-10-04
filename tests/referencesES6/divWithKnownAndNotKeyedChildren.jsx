import { newVNode, newComponentVNode } from "inferno";
newVNode(5, "div", null, [newComponentVNode(0, FooBar), newVNode(3, "div", null, "1")]);
