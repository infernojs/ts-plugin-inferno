import * as inferno from "inferno";
var createVNode = inferno.createVNode;
var createFragment = inferno.createFragment;
createFragment([createFragment([createVNode(1, "div", null, "Text", 16)], 4)], 4);
