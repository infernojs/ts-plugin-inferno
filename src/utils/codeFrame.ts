import {getLineAndCharacterOfPosition, SourceFile} from "typescript";

const LINES_ABOVE = 2;
const LINES_BELOW = 3;

// The line breaks of TypeScript's line map, so that the line numbers match the location in the message
const LINE_BREAK = /\r\n|[\n\r\u2028\u2029]/;

/*
 * The code around the text from start to end, in the plain format of Babel's code frames:
 *
 *   1 | function App() {
 * > 2 |   return <div $HasVNodeChildren>
 *     |               ^^^^^^^^^^^^^^^^^
 */
export default function codeFrame(sourceFile: SourceFile, start: number, end: number): string {
    const lines = sourceFile.text.split(LINE_BREAK);
    const from = getLineAndCharacterOfPosition(sourceFile, start);
    const to = getLineAndCharacterOfPosition(sourceFile, end);
    const first = Math.max(from.line - LINES_ABOVE, 0);
    const last = Math.min(to.line + LINES_BELOW, lines.length - 1);
    const width = String(last + 1).length;
    const frame: string[] = [];

    for (let i = first; i <= last; i++) {
        const line = lines[i];
        const gutter = ' ' + String(i + 1).padStart(width) + ' |';
        const code = line === '' ? '' : ' ' + line;

        if (i < from.line || i > to.line) {
            frame.push(' ' + gutter + code);
        } else {
            const markStart = i === from.line ? from.character : 0;
            const markEnd = i === to.line ? to.character : line.length;

            frame.push('>' + gutter + code);
            // Tabs are kept so that the markers line up with the code
            frame.push(' ' + gutter.replace(/\d/g, ' ') + ' ' + line.slice(0, markStart).replace(/[^\t]/g, ' ') + '^'.repeat(Math.max(markEnd - markStart, 1)));
        }
    }
    return frame.join('\n');
}
