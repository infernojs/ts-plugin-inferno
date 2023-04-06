var $inferno = require("inferno");
var createComponentVNode = $inferno.createComponentVNode;
var createVNode = $inferno.createVNode;
createComponentVNode(2, Comp, { "children": [createVNode(1, "p", null, "child1", 16), createVNode(1, "p", null, "child2", 16), createVNode(1, "p", null, "child3", 16)] });
