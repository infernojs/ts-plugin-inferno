import {ImportDeclaration, SyntaxKind, Node} from "typescript";

export function isImportDeclaration(node: Node): node is ImportDeclaration {
    return node.kind === SyntaxKind.ImportDeclaration
}
