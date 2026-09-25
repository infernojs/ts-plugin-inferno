const LINE_BREAK = /\r\n|\n|\r/;
const BLANK_LINES = /^[ \t\r\n]*$/;
const NOT_BLANK = /[^ \t]/;
const TABS = /\t/g;

function isBlank(charCode: number) {
    return charCode === 32 || charCode === 9;
}

/*
 * Collapses the whitespace of JSX text: tabs become spaces, the lines are trimmed of spaces except at the outer ends
 * of the text, lines left empty are dropped and the rest are joined with a space.
 */
export default function handleWhiteSpace(value: string): string {
    if (value.indexOf('\n') === -1 && value.indexOf('\r') === -1) {
        return value.indexOf('\t') === -1 ? value : value.replace(TABS, ' ');
    }
    // The indentation between elements, the most common text by far
    if (BLANK_LINES.test(value)) {
        return '';
    }
    const lines = value.split(LINE_BREAK);
    const lastLine = lines.length - 1;
    let lastNonEmptyLine = 0;
    let str = '';

    for (let i = lastLine; i > 0; i--) {
        if (NOT_BLANK.test(lines[i])) {
            lastNonEmptyLine = i;
            break;
        }
    }
    for (let i = 0; i <= lastLine; i++) {
        const line = lines[i];
        let start = 0;
        let end = line.length;

        if (i !== 0) {
            while (start < end && isBlank(line.charCodeAt(start))) {
                start++;
            }
        }
        if (i !== lastLine) {
            while (end > start && isBlank(line.charCodeAt(end - 1))) {
                end--;
            }
        }
        if (end > start) {
            const trimmed = line.slice(start, end);

            str += trimmed.indexOf('\t') === -1 ? trimmed : trimmed.replace(TABS, ' ');
            if (i !== lastNonEmptyLine) {
                str += ' ';
            }
        }
    }
    return str;
}
