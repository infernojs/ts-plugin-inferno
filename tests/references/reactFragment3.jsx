var inferno = require("inferno");
var createVNode = inferno.createVNode;
var createFragment = inferno.createFragment;
createFragment([createVNode(1, "span", null, "kk", 16, null, "ok"), createVNode(1, "div", null, "ok", 16, null, "ok2")], 8);
