"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isImportDeclaration = void 0;
var typescript_1 = require("typescript");
function isImportDeclaration(node) {
    return node.kind === typescript_1.SyntaxKind.ImportDeclaration;
}
exports.isImportDeclaration = isImportDeclaration;
