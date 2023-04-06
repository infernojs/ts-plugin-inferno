var $inferno = require("inferno");
var createTextVNode = $inferno.createTextVNode;
var createComponentVNode = $inferno.createComponentVNode;
var createVNode = $inferno.createVNode;
createVNode(1, "div", null, [createComponentVNode(2, FooBar), createTextVNode("foobar")], 4);
