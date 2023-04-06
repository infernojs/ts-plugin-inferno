var $inferno = require("inferno");
var normalizeProps = $inferno.normalizeProps;
var createVNode = $inferno.createVNode;
normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props, { "foo": "bar" })));
