import {SyntaxKind} from "typescript";

/*
 * Conservative check used to drop the value of a children prop that is replaced by JSX children:
 * returns false only for values whose evaluation cannot be observed, e.g. literals, identifiers and functions.
 */
export default function mayHaveSideEffects(node): boolean {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.FunctionExpression:
        case SyntaxKind.ArrowFunction:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumericLiteral:
        case SyntaxKind.BigIntLiteral:
        case SyntaxKind.RegularExpressionLiteral:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.NullKeyword:
            return false
        case SyntaxKind.TemplateExpression:
            return node.templateSpans.some(span => mayHaveSideEffects(span.expression))
        case SyntaxKind.ArrayLiteralExpression:
            return node.elements.some(element =>
                element.kind !== SyntaxKind.OmittedExpression &&
                (element.kind === SyntaxKind.SpreadElement || mayHaveSideEffects(element))
            )
        case SyntaxKind.ObjectLiteralExpression:
            return node.properties.some(property => {
                if (property.kind === SyntaxKind.ShorthandPropertyAssignment) {
                    return property.objectAssignmentInitializer !== undefined
                }
                return property.kind !== SyntaxKind.PropertyAssignment ||
                    property.name.kind === SyntaxKind.ComputedPropertyName ||
                    mayHaveSideEffects(property.initializer)
            })
        case SyntaxKind.PrefixUnaryExpression:
            // ++x and --x assign
            return node.operator === SyntaxKind.PlusPlusToken ||
                node.operator === SyntaxKind.MinusMinusToken ||
                mayHaveSideEffects(node.operand)
        case SyntaxKind.TypeOfExpression:
        case SyntaxKind.VoidExpression:
        case SyntaxKind.ParenthesizedExpression:
        case SyntaxKind.PartiallyEmittedExpression:
        case SyntaxKind.AsExpression:
        case SyntaxKind.SatisfiesExpression:
        case SyntaxKind.NonNullExpression:
        case SyntaxKind.TypeAssertionExpression:
            return mayHaveSideEffects(node.expression)
        default:
            return true
    }
}
