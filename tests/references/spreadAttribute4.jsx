var $inferno = require("inferno");
var normalizeProps = $inferno.normalizeProps;
var createVNode = $inferno.createVNode;
normalizeProps(createVNode(1, "div", null, "1", 16, Object.assign({}, props)));
