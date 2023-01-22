var inferno = require("inferno");
var createVNode = inferno.createVNode;
var foo = createVNode(1, "div", null, null, 1, { "data-attribute": "123" });
