import { createVNode, createTextVNode } from "inferno";
createVNode(1, "div", null, [createTextVNode("Okay"), createVNode(1, "span", null, "foo", 16)], 4);
