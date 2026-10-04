var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
newVNode(17, "div", null, null, { "foo": function () { return (newVNode(17, "div", null, null, { "bar": true })); } });
