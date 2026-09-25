/*
 * Builds the plugin to plain CommonJS for the benchmark. The working tree and git baselines are built the same way,
 * so that their results only differ by the plugin's code. The compiled files live in bench/.cache, where require()
 * still finds the repository's node_modules, so every version runs with the same TypeScript.
 */
const fs = require('fs')
const path = require('path')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

function sourceFiles(dir) {
    return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const file = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            return sourceFiles(file)
        }
        return /\.ts$/.test(entry.name) && !/\.d\.ts$/.test(entry.name) ? [file] : []
    })
}

// The target of tsconfig.json, as `npm run build` compiles dist/
function targetOfTsconfig() {
    const {config} = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile)
    const {options} = ts.parseJsonConfigFileContent(config, ts.sys, root)

    return options.target ?? ts.ScriptTarget.ESNext
}

// Compiles every .ts file of srcDir to outDir and returns the path of the entry point, outDir/index.js
function buildPlugin(srcDir, outDir) {
    const compilerOptions = {module: ts.ModuleKind.CommonJS, target: targetOfTsconfig()}

    fs.rmSync(outDir, {recursive: true, force: true})
    for (const file of sourceFiles(srcDir)) {
        const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {fileName: file, compilerOptions})
        const outFile = path.join(outDir, path.relative(srcDir, file)).replace(/\.ts$/, '.js')

        fs.mkdirSync(path.dirname(outFile), {recursive: true})
        fs.writeFileSync(outFile, output.outputText)
    }

    const entry = path.join(outDir, 'index.js')

    if (!fs.existsSync(entry)) {
        throw new Error('No index.ts in ' + srcDir)
    }
    return entry
}

// The transformer factory of a built plugin
function loadPlugin(entry) {
    const exported = require(entry)

    return exported.default || exported
}

module.exports = {buildPlugin, loadPlugin}
