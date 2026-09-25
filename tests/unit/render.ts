import {transform} from './helpers'

/*
 * Renders compiled JSX with the real Inferno runtime, so that a test can check what the user sees instead of the
 * generated calls. Inferno's render() needs a DOM, this is a minimal one with just the parts it uses to mount
 * elements, text and fragments. It is installed as a global when this module is loaded, before Inferno is required.
 */

class FakeNode {
    childNodes: FakeNode[] = []
    parentNode: FakeNode | null = null

    get firstChild(): FakeNode | null {
        return this.childNodes[0] ?? null
    }

    get lastChild(): FakeNode | null {
        return this.childNodes[this.childNodes.length - 1] ?? null
    }

    get nextSibling(): FakeNode | null {
        if (this.parentNode === null) {
            return null
        }
        const siblings = this.parentNode.childNodes

        return siblings[siblings.indexOf(this) + 1] ?? null
    }

    appendChild(child: FakeNode): FakeNode {
        return this.insertBefore(child, null)
    }

    insertBefore(child: FakeNode, reference: FakeNode | null): FakeNode {
        child.parentNode?.removeChild(child)

        const index = reference === null ? -1 : this.childNodes.indexOf(reference)

        if (index === -1) {
            this.childNodes.push(child)
        } else {
            this.childNodes.splice(index, 0, child)
        }
        child.parentNode = this
        return child
    }

    removeChild(child: FakeNode): FakeNode {
        this.childNodes.splice(this.childNodes.indexOf(child), 1)
        child.parentNode = null
        return child
    }

    replaceChild(newChild: FakeNode, oldChild: FakeNode): FakeNode {
        this.insertBefore(newChild, oldChild)
        return this.removeChild(oldChild)
    }

    get textContent(): string {
        return this.childNodes.map(child => child.textContent).join('')
    }

    set textContent(value: string) {
        for (const child of this.childNodes) {
            child.parentNode = null
        }
        this.childNodes = []
        if (value !== '' && value != null) {
            this.appendChild(new FakeText(String(value)))
        }
    }

    get outerHTML(): string {
        return ''
    }
}

class FakeText extends FakeNode {
    private value = ''

    constructor(value: unknown) {
        super()
        this.nodeValue = value
    }

    // Like the DOM, text is converted to a string, e.g. for a number child
    get nodeValue(): string {
        return this.value
    }

    set nodeValue(value: unknown) {
        this.value = String(value)
    }

    get textContent(): string {
        return this.nodeValue
    }

    set textContent(value: string) {
        this.nodeValue = value
    }

    get outerHTML(): string {
        return this.nodeValue.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }
}

class FakeElement extends FakeNode {
    readonly tagName: string
    readonly attributes = new Map<string, string>()
    readonly style: Record<string, string> = {}

    constructor(tagName: string) {
        super()
        this.tagName = tagName
    }

    setAttribute(name: string, value: unknown) {
        this.attributes.set(name, String(value))
    }

    setAttributeNS(_namespace: string, name: string, value: unknown) {
        this.setAttribute(name, value)
    }

    removeAttribute(name: string) {
        this.attributes.delete(name)
    }

    get className(): string {
        return this.attributes.get('class') ?? ''
    }

    set className(value: string) {
        if (value == null || value === '') {
            this.attributes.delete('class')
        } else {
            this.attributes.set('class', String(value))
        }
    }

    get innerHTML(): string {
        return this.childNodes.map(child => child.outerHTML).join('')
    }

    get outerHTML(): string {
        const attributes = [...this.attributes].map(([name, value]) => ` ${name}="${value}"`).join('')

        return `<${this.tagName}${attributes}>${this.innerHTML}</${this.tagName}>`
    }
}

const fakeDocument = {
    body: new FakeElement('body'),
    createElement: (tagName: string) => new FakeElement(tagName),
    createElementNS: (_namespace: string, tagName: string) => new FakeElement(tagName),
    createTextNode: (value: unknown) => new FakeText(value),
    addEventListener() {
    },
    removeEventListener() {
    }
}

// window.Node is checked when Inferno is loaded. node --test runs each test file in its own process, so the globals stay here.
Object.assign(globalThis, {document: fakeDocument, window: {}})

// Required after the DOM is installed, as Inferno checks for document.body when it is loaded
const inferno = require('inferno')

// Evaluates a compiled JSX expression with Inferno's vNode factories, identifiers of the snippet are passed in scope
export function evaluate(input: string, scope: Record<string, unknown> = {}): any {
    const code = transform(input).replace(/;$/, '')
    const factories = {
        createVNode: inferno.createVNode,
        createComponentVNode: inferno.createComponentVNode,
        createFragment: inferno.createFragment,
        createTextVNode: inferno.createTextVNode,
        normalizeProps: inferno.normalizeProps
    }
    const names = [...Object.keys(factories), ...Object.keys(scope)]
    const values = [...Object.values(factories), ...Object.values(scope)]

    return new Function(...names, `return ${code}`)(...values)
}

// The HTML that Inferno renders for a JSX expression, e.g. renderToHTML('<div>{x}</div>', {x: 1}) is "<div>1</div>"
export function renderToHTML(input: string, scope: Record<string, unknown> = {}): string {
    const container = fakeDocument.createElement('div')

    inferno.render(evaluate(input, scope), container)

    const html = container.innerHTML

    inferno.render(null, container)
    return html
}
