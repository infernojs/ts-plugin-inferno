function _stringLiteralTrimmer(lastNonEmptyLine, lineCount, line, i) {
    const isFirstLine = i === 0;
    const isLastLine = i === lineCount - 1;
    const isLastNonEmptyLine = i === lastNonEmptyLine;
    // replace rendered whitespace tabs with spaces
    let trimmedLine = line.replace(/\t/g, " ");
    // trim leading whitespace
    if (!isFirstLine) {
        trimmedLine = trimmedLine.replace(/^[ ]+/, "");
    }
    // trim trailing whitespace
    if (!isLastLine) {
        trimmedLine = trimmedLine.replace(/[ ]+$/, "");
    }
    if (trimmedLine.length > 0) {
        if (!isLastNonEmptyLine) {
            trimmedLine += " ";
        }
        return trimmedLine;
    }
    return "";
}

export default function handleWhiteSpace(value) {
    const lines = value.split(/\r\n|\n|\r/);
    let lastNonEmptyLine = 0;

    for (let i = lines.length - 1; i > 0; i--) {
        if (lines[i].match(/[^ \t]/)) {
            lastNonEmptyLine = i;
            break;
        }
    }
    const str = lines
        .map(_stringLiteralTrimmer.bind(null, lastNonEmptyLine, lines.length))
        .filter(function (line) {
            return line.length > 0;
        })
        .join("");

    if (str.length > 0) {
        return str;
    }
    return "";
}
