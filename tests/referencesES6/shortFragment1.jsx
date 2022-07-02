import { createFragment, createVNode, createTextVNode } from "inferno";
createFragment([createTextVNode("Okay"), createVNode(1, "span", null, "foo", 16)], 4);
