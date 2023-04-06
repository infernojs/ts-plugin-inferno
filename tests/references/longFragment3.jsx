var $inferno = require("inferno");
var createTextVNode = $inferno.createTextVNode;
var createFragment = $inferno.createFragment;
createFragment([createFragment([createTextVNode("Text")], 4)], 4);
