var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var normalizeProps = $inferno.normalizeProps;
normalizeProps(newVNode(3, "div", null, "1", Object.assign({}, props)));
