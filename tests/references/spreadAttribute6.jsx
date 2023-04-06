var $inferno = require("inferno");
var normalizeProps = $inferno.normalizeProps;
var createComponentVNode = $inferno.createComponentVNode;
createComponentVNode(2, FooBar, { "children": [normalizeProps(createComponentVNode(2, BarFoo, Object.assign({}, props))), createComponentVNode(2, NoNormalize)] });
