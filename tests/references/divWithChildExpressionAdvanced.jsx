var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
newVNode(1, "div", null, false && [
    newVNode(17, "div"),
    newVNode(17, "span")
]);
