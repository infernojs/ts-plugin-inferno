import * as inferno from "inferno";
var createComponentVNode = inferno.createComponentVNode;
var createVNode = inferno.createVNode;
createVNode(1, "div", null, [createComponentVNode(2, FooBar), createVNode(1, "div", null, "1", 16)], 4);
