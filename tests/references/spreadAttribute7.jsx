var $inferno = require("inferno");
var normalizeProps = $inferno.normalizeProps;
var createVNode = $inferno.createVNode;
normalizeProps(createVNode(1, "div", null, null, 1, Object.assign({}, props, other, { "foo": "bar", "foo2": "bar2" }, more, { "foo3": "bar3" })));
