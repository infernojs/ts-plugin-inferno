import {SyntaxKind} from "typescript";

export default function getValue(node, visitor, factory) {
    // A valueless attribute, e.g. <input checked />
    if (!node) {
        return factory.createTrue();
    }
    if (node.kind === SyntaxKind.StringLiteral) {
        return factory.createStringLiteral(node.text);
    }
    if (node.kind === SyntaxKind.JsxExpression) {
        if (!node.expression) {
            return factory.createNull();
        }
        return visitor(node.expression);
    }
    // An element or a fragment without braces, e.g. <div attr=<span /> />
    return visitor(node);
}
