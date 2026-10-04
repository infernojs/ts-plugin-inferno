var $inferno = require("inferno");
var newVNode = $inferno.newVNode;
var newTextVNode = $inferno.newTextVNode;
newVNode(1, "div", null, [a, newVNode(3, "div", null, "1"), newTextVNode(">>\u00A0\\u00a0\u00A0\\u00A0"), newVNode(1, "div", null, "&gt;&#62;&nbsp;\u00a0&#160;\u00A0")]);
