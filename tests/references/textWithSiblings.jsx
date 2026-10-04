var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newTextVNode = $inferno.newTextVNode;
newVNode(5, "div", null, [newTextVNode("Okay"), newVNode(3, "span", null, "foo")]);
