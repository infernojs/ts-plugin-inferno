var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newFragment = $inferno.newFragment;
var newTextVNode = $inferno.newTextVNode;
newFragment(260, [newTextVNode("Okay"), newVNode(3, "span", null, "foo")]);
