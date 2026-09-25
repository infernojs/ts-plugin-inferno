/*
 * Measures one phase of one benchmark case in a fresh process. bench/run.js forks it, sends the config over IPC
 * and gets the result back. The phases need different V8 flags, so each runs in its own process:
 * - time: default V8 settings (plus --expose-gc), so that timings include the GC and JIT work a real build does
 * - alloc: no optimizing compilers and a large young generation, see measureAllocations
 * - profile: CPU and allocation profiles through the inspector
 */
const fs = require('fs')
const path = require('path')
const url = require('url')
const v8 = require('v8')
const {performance, PerformanceObserver} = require('perf_hooks')
const ts = require('typescript')
const {loadPlugin} = require('./build')
const cases = require('./cases')
const stats = require('./stats')

const root = path.resolve(__dirname, '..')

/*
 * A single read of V8's cumulative allocation counter can be a few hundred KB off, so batches allocate at least this.
 * The plugin's bytes are the difference of two such counts, which for small files is a fraction of either, so the
 * batches are much larger than the read error alone would need.
 */
const ALLOCATION_BATCH_BYTES = 256 * 1024 * 1024
const MAX_BATCH_RUNS = 10000
const ALLOCATION_WARMUP_RUNS = 1

const BUDGETS = {
    full: {
        warmupMs: 500, warmupRuns: 5, sampleMs: 1500, minSamples: 20, maxSamples: 5000,
        allocationRounds: 3, leakMs: 2000, profileMs: 3000
    },
    quick: {
        warmupMs: 200, warmupRuns: 3, sampleMs: 500, minSamples: 5, maxSamples: 2000,
        allocationRounds: 2, leakMs: 500, profileMs: 1000
    }
}

// Options of both the e2e and the isolated tasks; --compiler-options adds to them
const DEFAULT_COMPILER_OPTIONS = {
    jsx: ts.JsxEmit.Preserve,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext
}

const hasAllocationCounter = typeof v8.getHeapStatistics().total_allocated_bytes === 'number'

function allocatedBytes() {
    return v8.getHeapStatistics().total_allocated_bytes
}

// GC entries arrive asynchronously, after the synchronous measurement loops have finished
const gcEntries = []

new PerformanceObserver(list => {
    gcEntries.push(...list.getEntries())
}).observe({entryTypes: ['gc']})

function flushGCEntries() {
    return new Promise(resolve => setTimeout(resolve, 50))
}

function gcDuring(window, runs) {
    let count = 0
    let ms = 0

    for (const entry of gcEntries) {
        if (entry.startTime >= window.start && entry.startTime < window.end) {
            count++
            ms += entry.duration
        }
    }
    return {perRun: count / runs, msPerRun: ms / runs}
}

// The --compiler-options JSON, in tsconfig.json notation like {"module": "commonjs"}
function compilerOptionsFromJson(json) {
    const {options, errors} = ts.convertCompilerOptionsFromJson(json, root)

    if (errors.length > 0) {
        throw new Error(errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'))
    }
    return {...DEFAULT_COMPILER_OPTIONS, ...options}
}

/*
 * The measured tasks. A task with a setup gets a fresh input from it on every run; the setup is never timed.
 * The transformer factory is created once, like a build that configures the plugin once for every file.
 */
function createTasks(fixture, plugin, compilerOptions) {
    const inferno = plugin()
    const scriptKind = /\.tsx$/.test(fixture.filename) ? ts.ScriptKind.TSX : ts.ScriptKind.JSX

    // With parent pointers, as the TypeScript compiler binds every file before it emits
    function parse() {
        return ts.createSourceFile(fixture.filename, fixture.source, ts.ScriptTarget.Latest, true, scriptKind)
    }

    /*
     * ts.transform() runs only the given transformers on an already parsed file, without TypeScript's own transforms
     * and without printing. The plugin sees the file as parsed, with the types still in it.
     */
    function transform(transformers) {
        return sourceFile => {
            ts.transform(sourceFile, transformers, compilerOptions).dispose()
        }
    }

    return {
        parse: {name: 'parse', run: parse},
        noop: {name: 'noop', setup: parse, run: transform([])},
        inferno: {name: 'inferno', setup: parse, run: transform([inferno])},
        // How the plugin runs in a build: parse, TypeScript's own transforms, the plugin as an after transformer and printing
        e2e: {
            name: 'e2e',
            run: () => {
                ts.transpileModule(fixture.source, {fileName: fixture.filename, compilerOptions, transformers: {after: [inferno]}})
            }
        }
    }
}

function runOnce(task) {
    task.run(task.setup ? task.setup() : undefined)
}

// Runs the tasks in turn for at least minRuns rounds and ms milliseconds, and at most maxRuns rounds
function repeat(taskList, ms, minRuns, maxRuns) {
    const start = performance.now()
    let runs = 0

    while (runs < maxRuns && (runs < minRuns || performance.now() - start < ms)) {
        for (const task of taskList) {
            runOnce(task)
        }
        runs++
    }
    return runs
}

/*
 * Times each task in alternating order (A B, B A, ...), so that drift such as CPU frequency changes affects every
 * task alike. Returns the milliseconds of every recorded run per task, sample i of each task from the same round,
 * and the time window of the recorded runs.
 */
function sampleTimes(taskList, budget) {
    const times = taskList.map(() => [])
    const window = {start: 0, end: 0}
    let round = 0

    function rounds(ms, minRounds, record) {
        const start = performance.now()

        for (let r = 0; r < budget.maxSamples && (r < minRounds || performance.now() - start < ms); r++) {
            for (let j = 0; j < taskList.length; j++) {
                const index = round % 2 === 0 ? j : taskList.length - 1 - j
                const task = taskList[index]
                const input = task.setup ? task.setup() : undefined
                const t0 = performance.now()

                task.run(input)
                const elapsed = performance.now() - t0

                if (record) {
                    times[index].push(elapsed)
                }
            }
            round++
        }
    }

    rounds(budget.warmupMs, budget.warmupRuns, false)
    global.gc()
    window.start = performance.now()
    rounds(budget.sampleMs, budget.minSamples, true)
    window.end = performance.now()

    return {times, window}
}

function heapUsedAfterGC() {
    global.gc()
    global.gc()
    return process.memoryUsage().heapUsed
}

/*
 * Heap growth after repeated runs; module level state that grows with every file would show up here.
 * TypeScript's heap varies by a couple of MB between readings even without the plugin, so after a warm-up batch the
 * growth is read over two more batches, and only growth in both counts: a leak grows the heap in every batch.
 */
function leakCheck(task, budget) {
    const runs = repeat([task], budget.leakMs / 3, 5, 50)

    repeat([task], 0, runs, runs)
    const h0 = heapUsedAfterGC()

    repeat([task], 0, runs, runs)
    const h1 = heapUsedAfterGC()

    repeat([task], 0, runs, runs)
    const h2 = heapUsedAfterGC()

    return {runs: runs * 2, retainedBytes: Math.max(0, Math.min(h1 - h0, h2 - h1)) * 2, growthBytes: [h1 - h0, h2 - h1]}
}

function countJSXNodes(sourceFile) {
    let count = 0

    function visit(node) {
        if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) {
            count++
        }
        ts.forEachChild(node, visit)
    }
    visit(sourceFile)
    return count
}

function load(config) {
    const fixture = cases.load(config.caseName)
    const tasks = createTasks(fixture, loadPlugin(config.pluginPath), compilerOptionsFromJson(config.compilerOptions))

    return {
        budget: config.quick ? BUDGETS.quick : BUDGETS.full,
        fixture,
        tasks,
        result: {
            case: fixture.name,
            filename: path.relative(root, fixture.filename),
            sourceBytes: Buffer.byteLength(fixture.source),
            nodes: countJSXNodes(tasks.parse.run())
        }
    }
}

async function measureTime(config) {
    const {budget, tasks, result} = load(config)

    if (config.mode !== 'isolated') {
        const e2e = sampleTimes([tasks.e2e], budget)

        await flushGCEntries()
        result.e2e = {
            time: stats.summarize(e2e.times[0]),
            gc: gcDuring(e2e.window, e2e.times[0].length)
        }
    }

    if (config.mode !== 'e2e') {
        const isolated = sampleTimes([tasks.noop, tasks.inferno], budget)
        const [noop, inferno] = isolated.times
        // Differences of runs from the same round; pairing cancels drift that the two medians alone would not
        const paired = inferno.map((ms, i) => ms - noop[i])

        result.isolated = {
            noop: {time: stats.summarize(noop)},
            inferno: {time: stats.summarize(inferno)},
            plugin: {time: stats.summarize(paired)}
        }
    }

    result.leak = leakCheck(config.mode !== 'isolated' ? tasks.e2e : tasks.inferno, budget)
    return result
}

/*
 * Bytes allocated per run of each task, including its setup.
 *
 * The count is only repeatable under conditions that need their own process (see ALLOCATION_FLAGS in run.js):
 * - No optimizing compilers (--no-opt --no-maglev). Optimized code allocates less thanks to escape analysis, but
 *   when functions get optimized varies from run to run, and so would the count. Without them the count is what
 *   the code itself allocates, an upper bound of what optimized code allocates.
 * - A young generation of hundreds of MB. V8 counts the objects a scavenge copies as allocated again, so every
 *   scavenge during a batch adds bytes that depend on GC timing rather than on the code.
 * - No forced GC right before a batch; after one, V8 recreates internal state and allocates extra.
 * The remaining errors only add bytes, so the minimum over the rounds is the best estimate.
 */
function measureAllocations(taskList, budget) {
    // Batch size from one run of the last task, which should be the most expensive one
    const a0 = allocatedBytes()

    runOnce(taskList[taskList.length - 1])
    const estimate = Math.max(allocatedBytes() - a0, 64 * 1024)
    const runs = Math.min(MAX_BATCH_RUNS, Math.max(1, Math.ceil(ALLOCATION_BATCH_BYTES / estimate)))
    const perRun = taskList.map(() => [])

    for (let r = 0; r < budget.allocationRounds; r++) {
        for (let j = 0; j < taskList.length; j++) {
            const before = allocatedBytes()

            for (let i = 0; i < runs; i++) {
                runOnce(taskList[j])
            }
            perRun[j].push((allocatedBytes() - before) / runs)
        }
    }

    return {
        batchRuns: runs,
        bytes: perRun.map(values => Math.min(...values)),
        // How much the rounds differed, as a fraction of the minimum; large values mean the count had not settled
        spread: perRun.map(values => {
            const min = Math.min(...values)

            return (Math.max(...values) - min) / min
        })
    }
}

function measureAlloc(config) {
    const {budget, tasks, result} = load(config)

    if (!hasAllocationCounter) {
        result.allocationCounter = false
        return result
    }
    result.allocationCounter = true

    const measured = config.mode === 'e2e' ? [tasks.e2e] : [tasks.parse, tasks.noop, tasks.inferno]

    if (config.mode === 'all') {
        measured.push(tasks.e2e)
    }
    // Lazy compilation, feedback vectors and TypeScript's caches allocate on the first runs only
    repeat(measured, 0, ALLOCATION_WARMUP_RUNS, ALLOCATION_WARMUP_RUNS)

    if (config.mode !== 'isolated') {
        const e2e = measureAllocations([tasks.e2e], budget)

        result.e2e = {bytes: e2e.bytes[0], spread: e2e.spread[0], batchRuns: e2e.batchRuns}
    }

    if (config.mode !== 'e2e') {
        // Every isolated run parses first, so the parse allocations are measured on their own and subtracted
        const isolated = measureAllocations([tasks.parse, tasks.noop, tasks.inferno], budget)
        const parseBytes = isolated.bytes[0]

        result.isolated = {
            parseBytes,
            noop: {bytes: isolated.bytes[1] - parseBytes},
            inferno: {bytes: isolated.bytes[2] - parseBytes},
            plugin: {bytes: isolated.bytes[2] - isolated.bytes[1]},
            spread: Math.max(...isolated.spread),
            batchRuns: isolated.batchRuns
        }
    }
    return result
}

function filePath(callFrameUrl) {
    return callFrameUrl.startsWith('file://') ? url.fileURLToPath(callFrameUrl) : callFrameUrl
}

function frameLabel(callFrame) {
    const file = callFrame.url ? path.relative(root, filePath(callFrame.url)) : '(native)'

    return (callFrame.functionName || '(anonymous)') + ' ' + file + ':' + (callFrame.lineNumber + 1)
}

// The flat node list of a .cpuprofile as a tree of {callFrame, self (ms), children}
function cpuTree(profile) {
    const nodes = new Map()

    for (const node of profile.nodes) {
        nodes.set(node.id, {callFrame: node.callFrame, self: 0, childIds: node.children || [], children: null})
    }
    for (let i = 0; i < profile.samples.length; i++) {
        nodes.get(profile.samples[i]).self += profile.timeDeltas[i] / 1000
    }
    for (const node of nodes.values()) {
        node.children = node.childIds.map(id => nodes.get(id))
    }
    return nodes.get(profile.nodes[0].id)
}

// A .heapprofile as a tree of {callFrame, self (bytes), children}
function heapTree(node) {
    return {
        callFrame: node.callFrame,
        self: node.selfSize,
        children: node.children.map(heapTree)
    }
}

// ts.transform(), the call that runs the plugin in the isolated task
function isTransformFrame(callFrame) {
    return callFrame.functionName === 'transform' && /[\\/]typescript\.js$/.test(filePath(callFrame.url))
}

/*
 * Sums a profile tree per function.
 * - Plugin functions get their self cost and their inclusive cost; recursive calls are only counted once.
 * - The plugin total is the inclusive cost of every outermost plugin frame, so it includes the TypeScript code the
 *   plugin calls, like the node factory and visitEachChild.
 * - Callees are the non-plugin functions that run below a plugin frame, by self cost.
 */
function attribute(tree, pluginDir, runs) {
    const prefix = pluginDir + path.sep
    const labels = new Map()
    const functions = new Map()
    const callees = new Map()
    const onStack = new Map()
    const totals = {all: 0, plugin: 0, transform: 0}

    function labelOf(callFrame) {
        const key = callFrame.url + ':' + callFrame.lineNumber + ':' + callFrame.columnNumber + ':' + callFrame.functionName
        let label = labels.get(key)

        if (!label) {
            label = {
                name: frameLabel(callFrame),
                plugin: callFrame.url !== '' && filePath(callFrame.url).startsWith(prefix)
            }
            labels.set(key, label)
        }
        return label
    }

    function entryOf(map, name) {
        let entry = map.get(name)

        if (!entry) {
            entry = {name, self: 0, inclusive: 0}
            map.set(name, entry)
        }
        return entry
    }

    function visit(node, insidePlugin, insideTransform) {
        const label = labelOf(node.callFrame)
        const isTransform = isTransformFrame(node.callFrame)
        const depth = onStack.get(label.name) || 0
        let inclusive = node.self

        onStack.set(label.name, depth + 1)
        for (const child of node.children) {
            inclusive += visit(child, insidePlugin || label.plugin, insideTransform || isTransform)
        }
        onStack.set(label.name, depth)

        totals.all += node.self
        if (label.plugin) {
            const entry = entryOf(functions, label.name)

            entry.self += node.self
            if (depth === 0) {
                entry.inclusive += inclusive
            }
            if (!insidePlugin) {
                totals.plugin += inclusive
            }
        } else if (insidePlugin) {
            entryOf(callees, label.name).self += node.self
        }
        if (isTransform && !insideTransform) {
            totals.transform += inclusive
        }
        return inclusive
    }

    function top(map, field) {
        return Array.from(map.values())
            .sort((a, b) => b[field] - a[field])
            .slice(0, 12)
            .map(entry => ({name: entry.name, self: entry.self / runs, inclusive: entry.inclusive / runs}))
    }

    visit(tree, false, false)
    return {
        perRun: {total: totals.all / runs, transform: totals.transform / runs, plugin: totals.plugin / runs},
        functions: top(functions, 'inclusive'),
        callees: top(callees, 'self')
    }
}

async function profile(config) {
    const inspector = require('inspector/promises')
    const job = load(config)
    const task = job.tasks.inferno
    const session = new inspector.Session()

    // Warm up first, so that the profile shows optimized code rather than the interpreter
    repeat([task], job.budget.warmupMs, job.budget.warmupRuns, Infinity)
    session.connect()

    // One pass per profiler: the allocation sampler slows down allocating code and would skew the CPU profile
    await session.post('Profiler.enable')
    await session.post('Profiler.setSamplingInterval', {interval: 100})
    await session.post('Profiler.start')
    const cpuRuns = repeat([task], job.budget.profileMs, 5, Infinity)
    const cpu = (await session.post('Profiler.stop')).profile

    await session.post('HeapProfiler.enable')
    await session.post('HeapProfiler.startSampling', {
        samplingInterval: 1024,
        includeObjectsCollectedByMajorGC: true,
        includeObjectsCollectedByMinorGC: true
    })
    const heapRuns = repeat([task], job.budget.profileMs, 5, Infinity)
    const heap = (await session.post('HeapProfiler.stopSampling')).profile

    session.disconnect()

    const base = path.join(config.profileDir, job.fixture.name.replace(/[^\w-]+/g, '-') + '-' + config.label)

    fs.writeFileSync(base + '.cpuprofile', JSON.stringify(cpu))
    fs.writeFileSync(base + '.heapprofile', JSON.stringify(heap))

    const pluginDir = path.dirname(path.resolve(config.pluginPath))

    return Object.assign(job.result, {
        runs: {cpu: cpuRuns, heap: heapRuns},
        cpu: attribute(cpuTree(cpu), pluginDir, cpuRuns),
        heap: attribute(heapTree(heap.head), pluginDir, heapRuns),
        files: [path.relative(root, base + '.cpuprofile'), path.relative(root, base + '.heapprofile')]
    })
}

const PHASES = {
    time: measureTime,
    alloc: measureAlloc,
    profile
}

process.once('message', config => {
    Promise.resolve()
        .then(() => PHASES[config.phase](config))
        .then(result => {
            process.send({result}, () => process.exit(0))
        }, error => {
            process.send({error: error && error.stack || String(error)}, () => process.exit(1))
        })
})
