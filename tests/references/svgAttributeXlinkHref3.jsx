var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
createVNode(32, "svg", 'test', createVNode(32, "use", null, null, 1, { "xlink:href": "asd" }), 2, { "focusable": "false" });
