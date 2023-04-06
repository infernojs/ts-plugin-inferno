var $inferno = require("inferno");
var createTextVNode = $inferno.createTextVNode;
var createFragment = $inferno.createFragment;
createFragment([createTextVNode("Test")], 4);
