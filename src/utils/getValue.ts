import {SyntaxKind} from "typescript";

export default function getValue(node, visitor, factory) {
    if (node.kind === SyntaxKind.StringLiteral) {
        return factory.createStringLiteral(node.text);
    }
    if (node.kind === SyntaxKind.JsxExpression) {
        if (!node.expression) {
            return factory.createNull();
        }
        return visitor(node.expression);
    }
}
