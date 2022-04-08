import * as ts from "typescript";
import {SyntaxKind} from "typescript";

export function isNamedImports(node: ts.Node): node is ts.NamedImports {
    return node.kind === SyntaxKind.NamedImports
}
