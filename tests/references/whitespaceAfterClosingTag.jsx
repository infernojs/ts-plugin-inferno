var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newTextVNode = $inferno.newTextVNode;
newVNode(5, "p", null, [newVNode(3, "span", null, "hello"), newTextVNode(" world")]);
