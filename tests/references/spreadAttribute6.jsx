var $inferno = require("inferno");
var newComponentVNode = $inferno.newComponentVNode;
var normalizeProps = $inferno.normalizeProps;
newComponentVNode(0, FooBar, { "children": [normalizeProps(newComponentVNode(0, BarFoo, Object.assign({}, props))), newComponentVNode(0, NoNormalize)] });
