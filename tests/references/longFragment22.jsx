import * as inferno from "inferno";
var createVNode = inferno.createVNode;
var createFragment = inferno.createFragment;
createFragment([createVNode(1, "div", null, "1", 16), createVNode(1, "span", null, "foo", 16)], 4, "foo");
