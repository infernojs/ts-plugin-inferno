import { newVNode, newTextVNode } from "inferno";
newVNode(5, "div", null, [newTextVNode("Okay"), newVNode(3, "span", null, "foo")]);
