var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var normalizeProps = $inferno.normalizeProps;
normalizeProps(newVNode(17, "div", "test", null, Object.assign({}, { "foo": "bar" }, props)));
