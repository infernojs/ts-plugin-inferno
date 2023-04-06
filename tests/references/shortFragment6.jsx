var $inferno = require("inferno");
var createTextVNode = $inferno.createTextVNode;
var createVNode = $inferno.createVNode;
var createFragment = $inferno.createFragment;
createFragment([createFragment([createVNode(1, "span"), createTextVNode("Text"), Wohoo], 0)], 4);
