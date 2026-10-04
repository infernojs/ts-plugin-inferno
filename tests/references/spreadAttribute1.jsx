var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var normalizeProps = $inferno.normalizeProps;
normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, { "foo": "bar" })));
