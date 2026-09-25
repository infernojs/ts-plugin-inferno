import {isIdentifierPart, isIdentifierStart, ScriptTarget} from "typescript";

// Whether a JSX tag name can be used as a JavaScript variable name, JSX names may also contain hyphens like Foo-bar
export default function isValidIdentifier(name: string) {
    // An index loop instead of for...of, which would allocate an iterator for every component tag
    for (let i = 0; i < name.length; i++) {
        const codePoint = name.codePointAt(i)

        if (i === 0 ? !isIdentifierStart(codePoint, ScriptTarget.Latest) : !isIdentifierPart(codePoint, ScriptTarget.Latest)) {
            return false
        }
        if (codePoint > 0xFFFF) {
            i++
        }
    }
    return name.length > 0
}
