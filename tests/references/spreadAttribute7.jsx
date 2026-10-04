var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var normalizeProps = $inferno.normalizeProps;
normalizeProps(newVNode(17, "div", null, null, Object.assign({}, props, other, { "foo": "bar", "foo2": "bar2" }, more, { "foo3": "bar3" })));
