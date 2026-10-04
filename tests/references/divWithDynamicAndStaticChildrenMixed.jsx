var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
newVNode(1, "div", null, [a, newVNode(3, "div", null, "1")]);
