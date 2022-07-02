import * as ts from "typescript";
import {SyntaxKind} from "typescript";

export function isImportDeclaration(node: ts.Node): node is ts.ImportDeclaration {
    return node.kind === SyntaxKind.ImportDeclaration
}
