import {isIdentifierPart, isIdentifierStart, ScriptTarget} from "typescript";

// Whether a JSX tag name can be used as a JavaScript variable name, JSX names may also contain hyphens like Foo-bar
export default function isValidIdentifier(name: string) {
    let first = true

    for (const char of name) {
        const codePoint = char.codePointAt(0)

        if (first ? !isIdentifierStart(codePoint, ScriptTarget.Latest) : !isIdentifierPart(codePoint, ScriptTarget.Latest)) {
            return false
        }
        first = false
    }
    return !first
}
