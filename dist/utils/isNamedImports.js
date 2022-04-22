"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNamedImports = void 0;
var typescript_1 = require("typescript");
function isNamedImports(node) {
    return node.kind === typescript_1.SyntaxKind.NamedImports;
}
exports.isNamedImports = isNamedImports;
