import { newVNode, newComponentVNode, newTextVNode } from "inferno";
newVNode(5, "div", null, [newComponentVNode(0, FooBar), newTextVNode("foobar")]);
