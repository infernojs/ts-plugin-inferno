var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newComponentVNode = $inferno.newComponentVNode;
newVNode(5, "div", null, [newComponentVNode(0, FooBar), newVNode(3, "div", null, "1")]);
