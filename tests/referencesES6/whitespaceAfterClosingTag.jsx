import { newVNode, newTextVNode } from "inferno";
newVNode(5, "p", null, [newVNode(3, "span", null, "hello"), newTextVNode(" world")]);
