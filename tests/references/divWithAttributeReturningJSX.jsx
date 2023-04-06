var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
createVNode(1, "div", null, null, 1, { "foo": function () { return (createVNode(1, "div", null, null, 1, { "bar": true })); } });
