"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
function getValue(node, visitor) {
    if (node.kind === ts.SyntaxKind.StringLiteral) {
        return ts.factory.createStringLiteral(node.text);
    }
    if (node.kind === ts.SyntaxKind.JsxExpression) {
        return visitor(node.expression);
    }
}
exports.default = getValue;
