import {SyntaxKind} from "typescript";
import decodeEntities from "./decodeEntities";

// A line break and the indentation after it, JSX attribute strings may span lines but JavaScript strings may not
const LINE_BREAK_AND_INDENT = /\r?\n\s+/g;

export default function getValue(node, visitor, factory) {
    // A valueless attribute, e.g. <input checked />
    if (!node) {
        return factory.createTrue();
    }
    if (node.kind === SyntaxKind.StringLiteral) {
        // JSX strings have no escape sequences, the text is taken as written. Line breaks in the source are collapsed
        // to a space like Babel's JSX transform does, then entities are decoded like TypeScript's JSX transform does.
        const text = node.text.indexOf('\n') === -1 ? node.text : node.text.replace(LINE_BREAK_AND_INDENT, ' ');

        return factory.createStringLiteral(decodeEntities(text));
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
