"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function isNodeNull(node) {
    if (!node) {
        return true;
    }
    if (node.kind === ts.SyntaxKind.ArrayLiteralExpression &&
        node.elements.length === 0) {
        return true;
    }
    return node.text === "null";
}
exports.default = isNodeNull;
