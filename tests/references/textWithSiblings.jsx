import * as inferno from "inferno";
var createTextVNode = inferno.createTextVNode;
var createVNode = inferno.createVNode;
createVNode(1, "div", null, [createTextVNode("Okay"), createVNode(1, "span", null, "foo", 16)], 4);
