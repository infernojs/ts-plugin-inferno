/*
 * Deterministic synthetic JSX modules for the benchmark. The same seed always gives the same source, so results of
 * different commits are comparable. Bump GENERATOR_VERSION whenever the generated code changes.
 * The sources are the same as the ones of babel-plugin-inferno's benchmark, so results of the two plugins compare.
 */
const GENERATOR_VERSION = 1
const SEED = 0x1f2e3d4c

const TARGETS = {
    'mixed-S': 200,
    'mixed-M': 2000,
    'mixed-L': 20000
}

const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' +
    'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea ' +
    'commodo consequat').split(' ')
const CONTAINER_TAGS = ['div', 'section', 'article', 'header', 'footer', 'main', 'nav', 'aside', 'ul', 'p', 'span', 'a', 'button', 'label', 'h2', 'h3']
const COMPONENTS = ['Card', 'Button', 'Panel', 'Avatar', 'Tooltip', 'Layout.Row', 'Layout.Column']
const CLASS_NAMES = ['row', 'col', 'card', 'card-body', 'btn btn-primary', 'active', 'list-item', 'is-hidden', 'title', 'muted']

// Small fast seeded PRNG, see https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
function mulberry32(seed) {
    return function () {
        seed = seed + 0x6D2B79F5 | 0
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed)

        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
        return ((t ^ t >>> 14) >>> 0) / 4294967296
    }
}

class Generator {
    constructor(seed) {
        this.random = mulberry32(seed)
        this.budget = 0
        this.ids = 0
    }

    int(min, max) {
        return min + Math.floor(this.random() * (max - min + 1))
    }

    chance(p) {
        return this.random() < p
    }

    pick(list) {
        return list[Math.floor(this.random() * list.length)]
    }

    // Picks a key of weights with a probability proportional to its weight
    weighted(weights) {
        let total = 0
        let key

        for (key in weights) {
            total += weights[key]
        }
        let r = this.random() * total

        for (key in weights) {
            r -= weights[key]
            if (r < 0) {
                return key
            }
        }
        return key
    }

    words(min, max) {
        const count = this.int(min, max)
        const words = []

        for (let i = 0; i < count; i++) {
            words.push(this.pick(WORDS))
        }
        return words.join(' ')
    }

    // Attributes of an HTML element, never the same prop twice because the plugin rejects duplicates
    htmlAttributes(tag) {
        const attributes = []

        if (this.chance(0.6)) {
            attributes.push('className="' + this.pick(CLASS_NAMES) + '"')
        }
        if (this.chance(0.15)) {
            attributes.push('id="node-' + (this.ids++) + '"')
        }
        if (tag === 'button' || tag === 'a' || this.chance(0.15)) {
            attributes.push('onClick={handlers.click}')
        }
        if (this.chance(0.05)) {
            attributes.push('onDoubleClick={handlers.open}')
        }
        if (tag === 'a') {
            attributes.push('href={"/items/" + props.id}')
        }
        if (tag === 'label') {
            attributes.push('htmlFor="field-' + this.ids + '"')
        }
        if (this.chance(0.1)) {
            attributes.push('tabIndex={0}')
        }
        if (this.chance(0.1)) {
            attributes.push('style={styles.' + this.pick(['box', 'text', 'grid']) + '}')
        }
        if (this.chance(0.1)) {
            attributes.push('data-index={' + this.int(0, 99) + '}')
        }
        if (this.chance(0.08)) {
            attributes.push('aria-label="' + this.words(1, 3) + '"')
        }
        if (this.chance(0.05)) {
            attributes.push('ref={refs.node}')
        }
        if (this.chance(0.02)) {
            attributes.push('contentEditable')
        }
        if (this.chance(0.06)) {
            attributes.push('{...props.rest}')
        }
        return attributes
    }

    open(name, attributes) {
        return '<' + name + (attributes.length > 0 ? ' ' + attributes.join(' ') : '')
    }

    // Children each on their own line, like hand-formatted code, so the plugin also sees the whitespace text between them
    withChildren(openTag, closeName, children, indent) {
        if (children.length === 0) {
            return openTag + ' />'
        }
        return openTag + '>\n' + children.map(child => indent + '  ' + child).join('\n') + '\n' + indent + '</' + closeName + '>'
    }

    children(depth, indent) {
        const count = depth >= 7 || this.budget <= 0 ? this.int(0, 1) : this.int(1, 4)
        const children = []

        for (let i = 0; i < count; i++) {
            children.push(this.node(depth + 1, indent + '  '))
        }
        return children
    }

    node(depth, indent) {
        const leafOnly = depth >= 8 || this.budget <= 0
        const kind = this.weighted(leafOnly ? {
            text: 4,
            expression: 3,
            input: 2
        } : {
            element: 30,
            component: 12,
            svg: 5,
            fragment: 5,
            list: 7,
            conditional: 6,
            text: 14,
            expression: 10,
            input: 8
        })

        switch (kind) {
            case 'element': {
                const tag = this.pick(CONTAINER_TAGS)

                this.budget--
                return this.withChildren(this.open(tag, this.htmlAttributes(tag)), tag, this.children(depth, indent), indent)
            }
            case 'component': {
                const name = this.pick(COMPONENTS)
                const props = ['title="' + this.words(1, 3) + '"']

                this.budget--
                if (this.chance(0.4)) {
                    props.push('item={props.item}')
                }
                if (this.chance(0.2)) {
                    props.push('onComponentDidMount={hooks.mount}')
                }
                if (this.chance(0.15)) {
                    props.push('{...props.rest}')
                }
                return this.withChildren(this.open(name, props), name, this.chance(0.6) ? this.children(depth, indent) : [], indent)
            }
            case 'svg':
                this.budget -= 3
                return '<svg viewBox="0 0 24 24" width={24} height={24} fill="none" className="icon">' +
                    '<path d="M4 12h16M12 4v16" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />' +
                    '<circle cx="12" cy="12" r="3" fillOpacity={0.5} clipPath="url(#clip)" /></svg>'
            case 'fragment': {
                this.budget--
                const fragmentChildren = this.children(depth, indent)

                if (fragmentChildren.length === 0) {
                    // <></> has no self-closing form
                    fragmentChildren.push(this.words(1, 3))
                }
                return this.withChildren('<', '', fragmentChildren, indent)
            }
            case 'list':
                this.budget--
                return '{props.items.map(function (item) {\n' +
                    indent + '  return <li key={item.id} className="list-item" onClick={handlers.select}>{item.label}</li>;\n' +
                    indent + '})}'
            case 'conditional':
                this.budget--
                return '{state.' + this.pick(['open', 'loading', 'error']) + ' && <span className="badge">' + this.words(1, 2) + '</span>}'
            case 'text':
                // Multi-line text with indentation, which the plugin collapses to single spaces
                return this.words(2, 8) + (this.chance(0.4) ? '\n' + indent + this.words(2, 6) : '')
            case 'expression':
                return this.pick(['{props.value}', '{state.count}', '{props.item.label}', '{format(props.date)}', '{props.children}'])
            default:
                this.budget--
                return '<input type="text" value={state.value} onInput={handlers.input} maxLength={40} readOnly={props.locked} autoComplete="off" />'
        }
    }

    view(index) {
        const tag = this.pick(['div', 'section', 'article'])

        this.budget--
        return 'export function View' + index + '(props) {\n' +
            '  var state = props.state;\n' +
            '  var handlers = props.handlers;\n' +
            '  return (\n' +
            '    ' + this.withChildren(this.open(tag, this.htmlAttributes(tag)), tag, this.children(0, '    '), '    ') + '\n' +
            '  );\n' +
            '}\n'
    }
}

const HEADER = 'import { Card, Button, Panel, Avatar, Tooltip, Layout } from \'./components\';\n' +
    'import { styles, refs, hooks, format } from \'./shared\';\n\n'

// Random but realistic component trees until about `target` JSX nodes are written
function mixed(target) {
    const generator = new Generator(SEED)
    const views = []

    while (target > 0) {
        // Each view gets a slice of the budget, so views stay component sized
        generator.budget = Math.min(target, 60)
        const before = generator.budget

        views.push(generator.view(views.length))
        target -= before - generator.budget
    }
    return HEADER + views.join('\n')
}

// One list with many keyed children; the key comes first so the plugin's key scan reads all attributes
function wide(count) {
    const items = []

    for (let i = 0; i < count; i++) {
        items.push('      <li key={' + i + '} className="item" data-index={' + i + '} onClick={handlers.select} tabIndex={-1}>Item ' + i + '</li>')
    }
    return 'export function Wide(props) {\n' +
        '  var handlers = props.handlers;\n' +
        '  return (\n' +
        '    <ul className="list">\n' + items.join('\n') + '\n    </ul>\n' +
        '  );\n' +
        '}\n'
}

// Views with deeply nested elements, `depth` levels each
function deep(views, depth) {
    const tags = ['div', 'section', 'span']
    const output = []

    for (let v = 0; v < views; v++) {
        let open = ''
        let close = ''

        for (let d = 0; d < depth; d++) {
            open += '<' + tags[d % 3] + ' className="level-' + d + '">'
            close = '</' + tags[d % 3] + '>' + close
        }
        output.push('export function Deep' + v + '(props) {\n  return (\n    ' + open + '{props.value}' + close + '\n  );\n}\n')
    }
    return output.join('\n')
}

const GENERATORS = {
    'mixed-S': () => mixed(TARGETS['mixed-S']),
    'mixed-M': () => mixed(TARGETS['mixed-M']),
    'mixed-L': () => mixed(TARGETS['mixed-L']),
    'wide-M': () => wide(2000),
    'deep-M': () => deep(10, 200)
}

function generate(name) {
    if (!Object.prototype.hasOwnProperty.call(GENERATORS, name)) {
        throw new Error('Unknown generated case ' + name)
    }
    return GENERATORS[name]()
}

module.exports = {
    GENERATOR_VERSION,
    names: Object.keys(GENERATORS),
    // Cases that take minutes rather than seconds; quick and compare runs skip them unless a filter names them
    large: ['mixed-L'],
    generate
}
