var $inferno = require("inferno");
var normalizeProps = $inferno.normalizeProps;
var createVNode = $inferno.createVNode;
normalizeProps(createVNode(1, "div", "test", null, 1, Object.assign({}, { "foo": "bar" }, props)));
