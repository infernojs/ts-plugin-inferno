var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newComponentVNode = $inferno.newComponentVNode;
var newTextVNode = $inferno.newTextVNode;
newVNode(5, "div", null, [newComponentVNode(0, FooBar), newTextVNode("foobar")]);
