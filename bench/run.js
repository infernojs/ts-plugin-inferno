/*
 * Benchmark of ts-plugin-inferno: time and allocations of the plugin itself, separated from TypeScript's own work.
 * Every case runs in a fresh worker process (bench/worker.js). See the Benchmarks section of README.md.
 */
const childProcess = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const {buildPlugin} = require('./build')
const cases = require('./cases')
const generate = require('./generate')
const stats = require('./stats')

const root = path.resolve(__dirname, '..')
const WORKER = path.join(__dirname, 'worker.js')
const RESULTS_DIR = path.join(__dirname, 'results')
const CACHE_DIR = path.join(__dirname, '.cache')
const MB = 1024 * 1024
// Relative changes below this are reported as no change in compare mode, even when every round agrees
const MIN_SIGNIFICANT_CHANGE = 0.01
const DEFAULT_PROFILE_CASE = 'mixed-M'
// V8 flags of the worker phases; bench/worker.js explains why allocations need their own
const TIME_FLAGS = ['--expose-gc']
const ALLOCATION_FLAGS = ['--no-opt', '--no-maglev', '--max-semi-space-size=256', '--min-semi-space-size=256']

const USAGE = [
    'Usage: node bench/run.js [options]',
    '',
    '  --quick                   shorter runs, for a first look',
    '  --filter <regex>          only cases whose name matches (' + generate.large.join(', ') + ' only runs without --quick\n' +
    '                            and --baseline, or when the filter names it)',
    '  --mode <mode>             e2e, isolated or all (default all)',
    '  --compiler-options <json> TypeScript compiler options in tsconfig.json notation, e.g. {"module": "commonjs"}\n' +
    '                            (default {"jsx": "preserve", "target": "esnext", "module": "esnext"})',
    '  --baseline <ref>          compare against a git ref, or a directory containing dist/index.js, index.js\n' +
    '                            or src/index.ts',
    '  --rounds <n>              rounds in compare mode (default 5, or 3 with --quick)',
    '  --profile                 CPU and allocation profiles of the plugin (default case ' + DEFAULT_PROFILE_CASE + ')',
    '  --json <file>             where to write the results (default bench/results/<date>-<sha>.json)',
    '',
    'Cases: ' + cases.names().join(', ')
].join('\n')

function parseArgs(argv) {
    const args = {quick: false, filter: null, mode: 'all', compilerOptions: {}, baseline: null, rounds: null, profile: false, json: null, help: false}

    for (let i = 0; i < argv.length; i++) {
        let arg = argv[i]
        let value = null
        const eq = arg.indexOf('=')

        if (eq !== -1) {
            value = arg.slice(eq + 1)
            arg = arg.slice(0, eq)
        }

        const next = () => {
            if (value !== null) {
                return value
            }
            if (i + 1 >= argv.length) {
                throw new Error(arg + ' needs a value')
            }
            return argv[++i]
        }

        switch (arg) {
            case '--quick':
                args.quick = true
                break
            case '--filter':
                args.filter = new RegExp(next())
                break
            case '--mode':
                args.mode = next()
                if (!['e2e', 'isolated', 'all'].includes(args.mode)) {
                    throw new Error('--mode must be e2e, isolated or all')
                }
                break
            case '--compiler-options':
                args.compilerOptions = JSON.parse(next())
                break
            case '--baseline':
                args.baseline = next()
                break
            case '--rounds':
                args.rounds = parseInt(next(), 10)
                break
            case '--profile':
                args.profile = true
                break
            case '--json':
                args.json = path.resolve(next())
                break
            case '--help':
            case '-h':
                args.help = true
                break
            default:
                throw new Error('Unknown argument ' + argv[i] + '\n\n' + USAGE)
        }
    }
    return args
}

function git(gitArgs) {
    return childProcess.execFileSync('git', gitArgs, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim()
}

function tryGit(gitArgs) {
    try {
        return git(gitArgs)
    } catch {
        return null
    }
}

function readGovernor() {
    try {
        return fs.readFileSync('/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor', 'utf8').trim()
    } catch {
        return null
    }
}

function environment() {
    const cpus = os.cpus()

    return {
        date: new Date().toISOString(),
        node: process.version,
        typescript: require('typescript').version,
        platform: process.platform + ' ' + os.release(),
        arch: process.arch,
        cpu: cpus.length > 0 ? cpus[0].model : null,
        cores: cpus.length,
        governor: readGovernor(),
        sha: tryGit(['rev-parse', '--short', 'HEAD']),
        // Only uncommitted changes to the plugin make results differ from the commit's
        dirty: tryGit(['status', '--porcelain', '--', 'src']) !== '',
        generatorVersion: generate.GENERATOR_VERSION
    }
}

// Messages a worker prints to stderr, e.g. deprecation warnings, repeat in every worker; they are shown once at the end
const warnings = new Map()

function collectWarnings(text) {
    const blocks = []

    for (const line of text.split('\n')) {
        if (line.trim() === '') {
            continue
        }
        if (/^\s/.test(line) && blocks.length > 0) {
            blocks[blocks.length - 1] += '\n' + line
        } else {
            blocks.push(line)
        }
    }
    for (const block of blocks) {
        warnings.set(block, (warnings.get(block) || 0) + 1)
    }
}

function printWarnings() {
    if (warnings.size === 0) {
        return
    }
    console.log('\nWorker stderr, ' + warnings.size + ' distinct messages:')
    warnings.forEach((count, block) => {
        console.log('  [' + count + 'x] ' + block.split('\n').join('\n  '))
    })
}

function runWorker(config, flags) {
    return new Promise((resolve, reject) => {
        const child = childProcess.fork(WORKER, [], {
            cwd: root,
            execArgv: flags,
            stdio: ['ignore', 'inherit', 'pipe', 'ipc']
        })
        let stderr = ''
        let reply = null

        child.stderr.setEncoding('utf8')
        child.stderr.on('data', chunk => {
            stderr += chunk
        })
        child.on('message', message => {
            reply = message
        })
        child.on('error', reject)
        child.on('exit', code => {
            if (reply && reply.result) {
                collectWarnings(stderr)
                resolve(reply.result)
            } else {
                reject(new Error(config.phase + ' worker for ' + config.caseName + ' failed' +
                    (reply && reply.error ? ':\n' + reply.error : ' with exit code ' + code + ':\n' + stderr)))
            }
        })
        child.send(config)
    })
}

function formatNumber(value, digits) {
    if (value === null || value === undefined || isNaN(value)) {
        return 'n/a'
    }
    return value.toFixed(digits)
}

function ms(value) {
    return formatNumber(value, value !== null && Math.abs(value) < 10 ? 3 : 1)
}

function mb(bytes) {
    if (typeof bytes !== 'number') {
        return 'n/a'
    }
    return formatNumber(bytes / MB, Math.abs(bytes) < 10 * MB ? 3 : 1)
}

function percent(fraction) {
    if (typeof fraction !== 'number' || isNaN(fraction)) {
        return 'n/a'
    }
    return formatNumber(fraction * 100, 1) + '%'
}

function signedPercent(fraction) {
    return (fraction > 0 ? '+' : '') + percent(fraction)
}

// Prints rows of cells as columns; the first column is left aligned, the others right aligned
function table(rows) {
    const widths = []

    for (const row of rows) {
        row.forEach((cell, i) => {
            widths[i] = Math.max(widths[i] || 0, String(cell).length)
        })
    }
    for (const row of rows) {
        console.log(row.map((cell, i) => i === 0 ? String(cell).padEnd(widths[i]) : String(cell).padStart(widths[i])).join('  ').trimEnd())
    }
}

function printEnvironment(env, args) {
    console.log('ts-plugin-inferno benchmark')
    console.log('  node ' + env.node + ', typescript ' + env.typescript + ', ' + env.cpu + ' (' + env.cores + ' cores), governor ' + (env.governor || 'unknown'))
    console.log('  commit ' + (env.sha || 'unknown') + (env.dirty ? ' with uncommitted changes in src/' : '') +
        ', compiler options ' + JSON.stringify(args.compilerOptions) + (args.quick ? ', quick' : ''))
    if (env.governor && env.governor !== 'performance') {
        console.log('  note: CPU governor is ' + env.governor + '; timings are noisier than with "performance"')
    }
    console.log('')
}

const RESULT_HEADER = [
    'case', 'nodes', 'e2e ms', '±', 'e2e MB', 'gc/op',
    'plugin ms', '±', 'plugin MB', 'µs/node', 'KB/node', 'share', 'leak'
]

function resultRow(result) {
    const e2e = result.e2e
    const plugin = result.isolated && result.isolated.plugin

    return [
        result.case,
        result.nodes,
        e2e ? ms(e2e.time.median) : '-',
        e2e ? percent(e2e.time.rme) : '-',
        e2e ? mb(e2e.bytes) : '-',
        e2e ? formatNumber(e2e.gc.perRun, 2) : '-',
        plugin ? ms(plugin.time.median) : '-',
        plugin ? percent(plugin.time.rme) : '-',
        plugin ? mb(plugin.bytes) : '-',
        plugin ? formatNumber(plugin.time.median * 1000 / result.nodes, 2) : '-',
        plugin ? formatNumber(plugin.bytes / 1024 / result.nodes, 2) : '-',
        plugin && e2e ? percent(plugin.time.median / e2e.time.median) : '-',
        result.leak.retainedBytes > MB ? '+' + mb(result.leak.retainedBytes) + ' MB' : 'ok'
    ]
}

function geomeanOf(results, get) {
    return stats.geomean(results.map(get).filter(value => value !== null && value !== undefined))
}

function summary(results) {
    return {
        cases: results.length,
        pluginMs: geomeanOf(results, r => r.isolated && r.isolated.plugin.time.median),
        pluginBytes: geomeanOf(results, r => r.isolated && r.isolated.plugin.bytes),
        e2eMs: geomeanOf(results, r => r.e2e && r.e2e.time.median),
        e2eBytes: geomeanOf(results, r => r.e2e && r.e2e.bytes)
    }
}

function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), {recursive: true})
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n')
    console.log('\nResults written to ' + path.relative(process.cwd(), file))
}

function defaultJsonPath(env, suffix) {
    const stamp = env.date.replace(/[:.]/g, '-').replace(/-\d+Z$/, '')

    return path.join(RESULTS_DIR, stamp + '-' + (env.sha || 'nogit') + (env.dirty ? '-dirty' : '') + (suffix || '') + '.json')
}

function baseConfig(args, pluginPath, caseName) {
    return {pluginPath, caseName, mode: args.mode, compilerOptions: args.compilerOptions, quick: args.quick}
}

// Copies the keys of source that target does not have, recursing into objects both have
function mergeInto(target, source) {
    for (const key of Object.keys(source)) {
        const value = source[key]

        if (value && typeof value === 'object' && target[key] && typeof target[key] === 'object') {
            mergeInto(target[key], value)
        } else if (!(key in target)) {
            target[key] = value
        }
    }
    return target
}

function runTime(config) {
    return runWorker({...config, phase: 'time'}, TIME_FLAGS)
}

function runAlloc(config) {
    return runWorker({...config, phase: 'alloc'}, ALLOCATION_FLAGS)
}

// Both phases of one case, as one result
async function measureCase(config) {
    const time = await runTime(config)

    return mergeInto(time, await runAlloc(config))
}

async function bench(names, args, env, pluginPath) {
    const results = []

    process.stdout.write('running:')
    for (const name of names) {
        results.push(await measureCase(baseConfig(args, pluginPath, name)))
        process.stdout.write(' ' + name)
    }
    process.stdout.write('\n\n')
    table([RESULT_HEADER].concat(results.map(resultRow)))

    const total = summary(results)

    console.log('\ngeomean of ' + total.cases + ' cases: plugin ' + ms(total.pluginMs) + ' ms, ' + mb(total.pluginBytes) +
        ' MB; e2e ' + ms(total.e2eMs) + ' ms, ' + mb(total.e2eBytes) + ' MB')
    console.log('plugin = ts.transform() of the parsed file with the plugin minus the same without it; share = plugin ms / e2e ms')
    console.log('MB = allocated per run, counted with V8\'s optimizing compilers off: repeatable, and an upper bound')
    printWarnings()
    writeJson(args.json || defaultJsonPath(env), {environment: env, args: jsonArgs(args), summary: total, results})
}

function jsonArgs(args) {
    return {...args, filter: args.filter ? args.filter.source : null}
}

// The working tree's src/, built to bench/.cache/working-tree on every run
function buildWorkingTree() {
    return buildPlugin(path.join(root, 'src'), path.join(CACHE_DIR, 'working-tree'))
}

/*
 * A git ref is extracted to bench/.cache/<sha>/src and built to bench/.cache/<sha>/dist. A directory is used as it
 * is when it contains a built plugin, like a copy of the published package, or built when it contains src/index.ts.
 */
function resolveBaseline(ref) {
    if (fs.existsSync(ref) && fs.statSync(ref).isDirectory()) {
        const dir = path.resolve(ref)
        const label = path.relative(root, dir) || '.'
        const built = [path.join(dir, 'dist', 'index.js'), path.join(dir, 'index.js')].find(file => fs.existsSync(file))

        if (built) {
            return {label, id: path.basename(dir), pluginPath: built}
        }
        if (fs.existsSync(path.join(dir, 'src', 'index.ts'))) {
            return {label, id: path.basename(dir), pluginPath: buildPlugin(path.join(dir, 'src'), path.join(CACHE_DIR, 'dir-' + path.basename(dir)))}
        }
        throw new Error('No dist/index.js, index.js or src/index.ts in ' + ref)
    }

    const sha = tryGit(['rev-parse', '--verify', ref + '^{commit}'])

    if (!sha) {
        throw new Error(ref + ' is neither a directory nor a git revision')
    }
    const target = path.join(CACHE_DIR, sha)
    const entry = path.join(target, 'dist', 'index.js')

    if (!fs.existsSync(entry)) {
        fs.rmSync(target, {recursive: true, force: true})
        fs.mkdirSync(target, {recursive: true})
        childProcess.execFileSync('tar', ['-x', '-C', target], {
            input: childProcess.execFileSync('git', ['archive', sha, 'src'], {cwd: root, maxBuffer: 64 * MB})
        })
        buildPlugin(path.join(target, 'src'), path.join(target, 'dist'))
    }
    return {label: ref + ' (' + sha.slice(0, 7) + ')', id: sha.slice(0, 7), pluginPath: entry}
}

const COMPARED_METRICS = [
    {name: 'plugin ms', phase: 'time', format: ms, get: r => r.isolated && r.isolated.plugin.time.median},
    {name: 'plugin MB', phase: 'alloc', format: mb, get: r => r.isolated && r.isolated.plugin.bytes},
    {name: 'e2e ms', phase: 'time', format: ms, get: r => r.e2e && r.e2e.time.median},
    {name: 'e2e MB', phase: 'alloc', format: mb, get: r => r.e2e && r.e2e.bytes}
]

/*
 * The change of a metric: the median over rounds of current / baseline - 1, where both ran in the same round.
 * It counts as a change only when every round agrees on the direction, and the median change is at least 1% and
 * larger than the margin of error of the median.
 */
function change(metric, current, baseline) {
    const deltas = []

    for (let i = 0; i < current.length; i++) {
        const a = metric.get(current[i])
        const b = metric.get(baseline[i])

        if (a !== null && a !== undefined && b !== null && b !== undefined && b > 0) {
            deltas.push(a / b - 1)
        }
    }
    if (deltas.length === 0) {
        return null
    }
    const median = stats.median(deltas)
    const min = Math.min(...deltas)
    const max = Math.max(...deltas)

    return {
        current: stats.median(current.map(metric.get)),
        baseline: stats.median(baseline.map(metric.get)),
        delta: median,
        min,
        max,
        significant: (min > 0 || max < 0) && Math.abs(median) >= MIN_SIGNIFICANT_CHANGE &&
            Math.abs(median) > stats.marginOfMedian(deltas)
    }
}

async function compare(names, args, env, pluginPath) {
    const baseline = resolveBaseline(args.baseline)
    const rounds = args.rounds || (args.quick ? 3 : 5)
    const versions = [
        {key: 'current', label: 'working tree', pluginPath},
        {key: 'baseline', label: baseline.label, pluginPath: baseline.pluginPath}
    ]
    const raw = {}

    console.log('Comparing the working tree with ' + baseline.label + ', ' + rounds + ' rounds of ' + names.length + ' cases\n')
    for (const name of names) {
        raw[name] = {current: {time: [], alloc: []}, baseline: {time: [], alloc: []}}
    }

    for (let round = 0; round < rounds; round++) {
        process.stdout.write('round ' + (round + 1) + '/' + rounds + ':')
        for (let i = 0; i < names.length; i++) {
            // Alternate which version goes first, so that neither always runs on a warmer or cooler machine
            const order = (round + i) % 2 === 0 ? versions : versions.slice().reverse()

            for (const version of order) {
                // The rounds repeat the measurements, so each worker gets the quick budget
                const config = {...baseConfig(args, version.pluginPath, names[i]), quick: true}
                const runs = raw[names[i]][version.key]

                runs.time.push(await runTime(config))
                // Allocation counts repeat to about 1%, so two rounds are enough to see that they agree
                if (round < 2) {
                    runs.alloc.push(await runAlloc(config))
                }
            }
            process.stdout.write(' ' + names[i])
        }
        process.stdout.write('\n')
    }

    const rows = [['case', 'metric', 'baseline', 'current', 'change', 'range']]
    const changes = {}

    for (const name of names) {
        changes[name] = {}
        COMPARED_METRICS.forEach((metric, index) => {
            const c = change(metric, raw[name].current[metric.phase], raw[name].baseline[metric.phase])

            changes[name][metric.name] = c
            if (c === null) {
                return
            }
            rows.push([
                index === 0 ? name : '',
                metric.name,
                metric.format(c.baseline),
                metric.format(c.current),
                (c.significant ? '' : '~') + signedPercent(c.delta),
                signedPercent(c.min) + ' .. ' + signedPercent(c.max)
            ])
        })
    }

    console.log('')
    table(rows)

    // Geometric mean of the per case ratios, the headline number of the comparison
    const headline = COMPARED_METRICS.map(metric => {
        const ratios = names
            .map(name => changes[name][metric.name])
            .filter(c => c)
            .map(c => 1 + c.delta)

        return ratios.length > 0 ? metric.name + ' ' + signedPercent(stats.geomean(ratios) - 1) : null
    }).filter(Boolean)

    console.log('\ngeomean change over ' + names.length + ' cases: ' + headline.join(', '))
    console.log('change = median over rounds of current/baseline - 1; "~" = rounds disagree on the direction or |change| < ' +
        percent(MIN_SIGNIFICANT_CHANGE))
    printWarnings()
    writeJson(args.json || defaultJsonPath(env, '-vs-' + baseline.id), {
        environment: env,
        args: jsonArgs(args),
        baseline,
        rounds,
        changes,
        raw
    })
}

function printAttribution(title, unit, attribution, format) {
    const perRun = attribution.perRun
    const share = perRun.transform > 0 ? ' = ' + percent(perRun.plugin / perRun.transform) + ' of ts.transform' : ''

    console.log('  ' + title + ': plugin ' + format(perRun.plugin) + ' ' + unit + '/op' + share)
    table([['    plugin function', 'incl ' + unit, 'self ' + unit]].concat(
        attribution.functions.map(entry => ['    ' + entry.name, format(entry.inclusive), format(entry.self)])
    ))
    console.log('')
    table([['    called from plugin code', 'self ' + unit]].concat(
        attribution.callees.map(entry => ['    ' + entry.name, format(entry.self)])
    ))
    console.log('')
}

async function profile(names, args, env, pluginPath) {
    fs.mkdirSync(RESULTS_DIR, {recursive: true})
    for (const name of names) {
        const result = await runWorker({
            ...baseConfig(args, pluginPath, name),
            phase: 'profile',
            profileDir: RESULTS_DIR,
            label: (env.sha || 'nogit') + (env.dirty ? '-dirty' : '')
        }, TIME_FLAGS)

        console.log(result.case + ' (' + result.nodes + ' JSX nodes, ts.transform() of the parsed file, ' + result.runs.cpu +
            ' runs for time and ' + result.runs.heap + ' for allocations)')
        printAttribution('time', 'ms', result.cpu, ms)
        printAttribution('allocations', 'MB', result.heap, mb)
        console.log('  profiles: ' + result.files.join(', ') + ' (open in Chrome DevTools or https://www.speedscope.app)\n')
    }
    console.log('Profiling slows the code down; use the numbers for proportions, and bench for absolute times.')
    printWarnings()
}

function selectCases(args) {
    const all = cases.names()

    if (!args.filter) {
        if (args.profile) {
            return [DEFAULT_PROFILE_CASE]
        }
        if (args.quick || args.baseline) {
            console.log('Skipping ' + generate.large.join(', ') + ' in quick and compare runs; use --filter to include it\n')
            return all.filter(name => !generate.large.includes(name))
        }
        return all
    }
    return all.filter(name => args.filter.test(name))
}

async function main() {
    const args = parseArgs(process.argv.slice(2))

    if (args.help) {
        console.log(USAGE)
        return
    }

    const names = selectCases(args)

    if (names.length === 0) {
        throw new Error('No case matches ' + args.filter + '. Cases: ' + cases.names().join(', '))
    }

    const env = environment()
    const pluginPath = buildWorkingTree()

    printEnvironment(env, args)
    if (args.profile) {
        await profile(names, args, env, pluginPath)
    } else if (args.baseline) {
        await compare(names, args, env, pluginPath)
    } else {
        await bench(names, args, env, pluginPath)
    }
}

main().catch(error => {
    console.error(error.message || error)
    process.exitCode = 1
})
