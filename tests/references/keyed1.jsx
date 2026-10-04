var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newComponentVNode = $inferno.newComponentVNode;
newVNode(33, "div", null, [newComponentVNode(0, FooBar, null, "foo"), newVNode(3, "div", null, "1", null, "1")]);
