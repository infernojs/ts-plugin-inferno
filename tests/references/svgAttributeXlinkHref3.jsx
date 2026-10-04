var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
newVNode(72, "svg", 'test', newVNode(80, "use", null, null, { "xlink:href": "asd" }), { "focusable": "false" });
