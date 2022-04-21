import * as inferno_1 from "inferno";
var createVNode = inferno_1.createVNode;
createVNode(1, "div", null, null, 1, { "foo": function () { return (createVNode(1, "div", null, null, 1, { "bar": true })); } });
