var $inferno = require("inferno");
var createTextVNode = $inferno.createTextVNode;
var createVNode = $inferno.createVNode;
createVNode(1, "div", null, [a, createVNode(1, "div", null, "1", 16), createTextVNode(">>\u00A0\\u00a0\u00A0\\u00A0"), createVNode(1, "div", null, "&gt;&#62;&nbsp;\u00a0&#160;\u00A0", 0)], 0);
