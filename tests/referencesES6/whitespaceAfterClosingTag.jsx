import { createVNode, createTextVNode } from "inferno";
createVNode(1, "p", null, [createVNode(1, "span", null, "hello", 16), createTextVNode(" world")], 4);
