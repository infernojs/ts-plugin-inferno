var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
createVNode(1, "div", null, false && [
    createVNode(1, "div"),
    createVNode(1, "span")
], 0);
