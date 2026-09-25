import {idText, SyntaxKind} from "typescript";

export default function isNodeNull(node) {
    if (!node) {
        return true;
    }

    if (node.kind === SyntaxKind.NullKeyword) {
        return true;
    }

    if (
        node.kind === SyntaxKind.ArrayLiteralExpression &&
        node.elements.length === 0
    ) {
        return true;
    }

    // Only an identifier can be named null, the text of a string like "null" is a value
    return node.kind === SyntaxKind.Identifier && idText(node) === "null";
}
