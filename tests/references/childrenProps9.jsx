import * as inferno from "inferno";
var createVNode = inferno.createVNode;
createVNode(1, "foo", null, createVNode(1, "span", null, "b", 16), 2);
