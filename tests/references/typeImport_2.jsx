"use strict";
var $inferno = require("inferno");
var createVNode = $inferno.createVNode;
Object.defineProperty(exports, "__esModule", { value: true });
exports.Visualizer = Visualizer;
var test_1 = require("./test");
function Visualizer(_a) {
    var number = _a.number, other = _a.other;
    return (createVNode(1, "div", "visualizer test", [test_1.a, number, other], 0));
}
