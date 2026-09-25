const fs = require('fs')
const path = require('path')
const generate = require('./generate')

const FIXTURES_DIR = path.join(__dirname, 'fixtures')

function handWritten() {
    return fs.readdirSync(FIXTURES_DIR).filter(file => /\.[jt]sx$/.test(file)).sort()
}

// Hand-written fixtures first, then the generated ones from small to large
function names() {
    return handWritten().concat(generate.names)
}

// Returns {name, filename, source}; generated cases get a virtual .jsx filename, so TypeScript parses them as JSX
function load(name) {
    if (generate.names.includes(name)) {
        return {
            name,
            filename: path.join(__dirname, 'generated', name + '.jsx'),
            source: generate.generate(name)
        }
    }
    const filename = path.join(FIXTURES_DIR, name)

    return {name, filename, source: fs.readFileSync(filename, 'utf8')}
}

module.exports = {names, load}
