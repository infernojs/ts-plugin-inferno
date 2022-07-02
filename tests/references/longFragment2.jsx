import * as inferno from "inferno";
var createTextVNode = inferno.createTextVNode;
var createVNode = inferno.createVNode;
var createFragment = inferno.createFragment;
createFragment([createTextVNode("Okay"), createVNode(1, "span", null, "foo", 16)], 4);
