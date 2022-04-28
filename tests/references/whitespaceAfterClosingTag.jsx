import * as inferno from "inferno";
var createTextVNode = inferno.createTextVNode;
var createVNode = inferno.createVNode;
createVNode(1, "p", null, [createVNode(1, "span", null, "hello", 16), createTextVNode(" world")], 4);
