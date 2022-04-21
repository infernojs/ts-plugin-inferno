import * as inferno_1 from "inferno";
var createTextVNode = inferno_1.createTextVNode;
var createComponentVNode = inferno_1.createComponentVNode;
var createVNode = inferno_1.createVNode;
createVNode(1, "div", null, [createComponentVNode(2, FooBar), createTextVNode("foobar")], 4);
