// Every attribute in MDN's SVG attribute reference, checked against the plugin.
// Lists are the same as in babel-plugin-inferno tests/svg-attributes.test.js, data retrieved on 2026-09-25 from:
// - MDN: https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute (the A to Z and category lists)
// - HTML spec: https://html.spec.whatwg.org/multipage/parsing.html#adjust-svg-attributes
//   This table holds every mixed-case SVG attribute name; all other SVG attributes are lowercase, hyphenated or
//   namespaced. React-style camelCase names of hyphenated and namespaced attributes are mapped by
//   src/utils/svgAttributes.ts and src/utils/attributeTransforms.ts, those of lowercase attributes by
//   src/utils/lowerCaseAttributes.ts.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'

// Attribute names as they appear in the DOM. `class` and `data-*` are tested separately.
// MDN spells the DOM property referrerPolicy; the attribute is lowercase because it is not in the HTML spec table.
const mdnAttributes = [
    'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'attributeName', 'attributeType', 'autofocus',
    'azimuth', 'baseFrequency', 'baseline-shift', 'baseProfile', 'begin', 'bias', 'by', 'calcMode', 'clip',
    'clip-path', 'clip-rule', 'clipPathUnits', 'color', 'color-interpolation', 'color-interpolation-filters',
    'crossorigin', 'cursor', 'cx', 'cy', 'd', 'decoding', 'diffuseConstant', 'direction', 'display', 'divisor',
    'dominant-baseline', 'download', 'dur', 'dx', 'dy', 'edgeMode', 'elevation', 'end', 'exponent',
    'fetchpriority', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterUnits', 'flood-color', 'flood-opacity',
    'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight',
    'font-width', 'fr', 'from', 'fx', 'fy', 'glyph-orientation-horizontal', 'glyph-orientation-vertical',
    'gradientTransform', 'gradientUnits', 'height', 'href', 'hreflang', 'id', 'image-rendering', 'in', 'in2',
    'intercept', 'k1', 'k2', 'k3', 'k4', 'kernelMatrix', 'kernelUnitLength', 'keyPoints', 'keySplines', 'keyTimes',
    'lang', 'lengthAdjust', 'letter-spacing', 'lighting-color', 'limitingConeAngle', 'marker-end', 'marker-mid',
    'marker-start', 'markerHeight', 'markerUnits', 'markerWidth', 'mask', 'mask-type', 'maskContentUnits',
    'maskUnits', 'max', 'media', 'method', 'min', 'mode', 'numOctaves', 'offset', 'onauxclick', 'onblur',
    'oncuechange', 'opacity', 'operator', 'order', 'orient', 'origin', 'overflow', 'paint-order', 'path',
    'pathLength', 'patternContentUnits', 'patternTransform', 'patternUnits', 'ping', 'pointer-events', 'points',
    'pointsAtX', 'pointsAtY', 'pointsAtZ', 'preserveAlpha', 'preserveAspectRatio', 'primitiveUnits', 'r', 'radius',
    'referrerpolicy', 'refX', 'refY', 'rel', 'repeatCount', 'repeatDur', 'requiredExtensions', 'requiredFeatures',
    'restart', 'result', 'rotate', 'rx', 'ry', 'scale', 'seed', 'shape-rendering', 'side', 'slope', 'spacing',
    'specularConstant', 'specularExponent', 'spreadMethod', 'startOffset', 'stdDeviation', 'stitchTiles',
    'stop-color', 'stop-opacity', 'stroke', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap',
    'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width', 'style', 'surfaceScale',
    'systemLanguage', 'tabindex', 'tableValues', 'target', 'targetX', 'targetY', 'text-anchor', 'text-decoration',
    'text-overflow', 'text-rendering', 'textLength', 'to', 'transform', 'transform-origin', 'type', 'unicode-bidi',
    'values', 'vector-effect', 'version', 'viewBox', 'visibility', 'white-space', 'width', 'word-spacing',
    'writing-mode', 'x', 'x1', 'x2', 'xChannelSelector', 'xlink:actuate', 'xlink:arcrole', 'xlink:href',
    'xlink:role', 'xlink:show', 'xlink:title', 'xlink:type', 'xml:lang', 'xml:space', 'y', 'y1', 'y2',
    'yChannelSelector', 'z', 'zoomAndPan'
]

// Mixed-case names from the HTML spec table. glyphRef and viewTarget are deprecated and no longer listed on MDN.
const mixedCaseAttributes = [
    'attributeName', 'attributeType', 'baseFrequency', 'baseProfile', 'calcMode', 'clipPathUnits',
    'diffuseConstant', 'edgeMode', 'filterUnits', 'glyphRef', 'gradientTransform', 'gradientUnits', 'kernelMatrix',
    'kernelUnitLength', 'keyPoints', 'keySplines', 'keyTimes', 'lengthAdjust', 'limitingConeAngle', 'markerHeight',
    'markerUnits', 'markerWidth', 'maskContentUnits', 'maskUnits', 'numOctaves', 'pathLength',
    'patternContentUnits', 'patternTransform', 'patternUnits', 'pointsAtX', 'pointsAtY', 'pointsAtZ',
    'preserveAlpha', 'preserveAspectRatio', 'primitiveUnits', 'refX', 'refY', 'repeatCount', 'repeatDur',
    'requiredExtensions', 'requiredFeatures', 'specularConstant', 'specularExponent', 'spreadMethod',
    'startOffset', 'stdDeviation', 'stitchTiles', 'surfaceScale', 'systemLanguage', 'tableValues', 'targetX',
    'targetY', 'textLength', 'viewBox', 'viewTarget', 'xChannelSelector', 'yChannelSelector', 'zoomAndPan'
]

// React-style camelCase names of lowercase attributes
const lowercaseAliases = {
    autoFocus: 'autofocus',
    crossOrigin: 'crossorigin',
    fetchPriority: 'fetchpriority',
    hrefLang: 'hreflang',
    referrerPolicy: 'referrerpolicy',
    tabIndex: 'tabindex'
}

function camelCase(name: string) {
    return name.replace(/[-:]([a-z])/g, (_match, letter) => letter.toUpperCase())
}

function rectProps(name: string) {
    return `createVNode(32, "rect", null, null, 1, { "${name}": "v" });`
}

describe('SVG attributes (MDN reference)', () => {
    describe('attributes written as in the DOM', () => {
        for (const name of mdnAttributes.filter(name => !mixedCaseAttributes.includes(name))) {
            it(`Should keep ${name}`, () => {
                assert.equal(transform(`<rect ${name}="v" />`), rectProps(name))
            })
        }

        it('Should pass class as the className argument', () => {
            assert.equal(transform('<rect class="v" />'), 'createVNode(32, "rect", "v");')
        })

        it('Should keep data-* attributes', () => {
            assert.equal(transform('<rect data-foo="v" />'), rectProps('data-foo'))
        })
    })

    describe('mixed-case attributes from the HTML spec', () => {
        for (const name of mixedCaseAttributes) {
            it(`Should keep ${name} in camelCase`, () => {
                assert.equal(transform(`<rect ${name}="v" />`), rectProps(name))
            })
        }

        it('Should keep lengthAdjust in camelCase on svg text', () => {
            assert.equal(
                transform('<svg><text lengthAdjust="spacing" /></svg>'),
                'createVNode(32, "svg", null, createVNode(32, "text", null, null, 1, { "lengthAdjust": "spacing" }), 2);'
            )
        })

        it('Should keep xChannelSelector and yChannelSelector in camelCase on feDisplacementMap', () => {
            assert.equal(
                transform('<feDisplacementMap xChannelSelector="R" yChannelSelector="G" />'),
                'createVNode(32, "feDisplacementMap", null, null, 1, { "xChannelSelector": "R", "yChannelSelector": "G" });'
            )
        })
    })

    describe('camelCase names of hyphenated and namespaced attributes', () => {
        for (const name of mdnAttributes.filter(name => /[-:]/.test(name))) {
            it(`Should map ${camelCase(name)} to ${name}`, () => {
                assert.equal(transform(`<rect ${camelCase(name)}="v" />`), rectProps(name))
            })
        }
    })

    describe('camelCase names of presentation attributes on their elements', () => {
        it('Should map maskType to mask-type on mask', () => {
            assert.equal(transform('<mask maskType="alpha" />'), 'createVNode(32, "mask", null, null, 1, { "mask-type": "alpha" });')
        })

        it('Should map textOverflow to text-overflow on text', () => {
            assert.equal(transform('<text textOverflow="ellipsis" />'), 'createVNode(32, "text", null, null, 1, { "text-overflow": "ellipsis" });')
        })

        it('Should map whiteSpace to white-space on text', () => {
            assert.equal(transform('<text whiteSpace="nowrap" />'), 'createVNode(32, "text", null, null, 1, { "white-space": "nowrap" });')
        })

        it('Should map fontWidth to font-width on text', () => {
            assert.equal(transform('<text fontWidth="condensed" />'), 'createVNode(32, "text", null, null, 1, { "font-width": "condensed" });')
        })
    })

    describe('camelCase names of lowercase attributes', () => {
        for (const name of Object.keys(lowercaseAliases)) {
            it(`Should map ${name} to ${lowercaseAliases[name]}`, () => {
                assert.equal(transform(`<rect ${name}="v" />`), rectProps(lowercaseAliases[name]))
            })
        }
    })

    describe('TSX', () => {
        it('Should map camelCase svg attributes whose values have type assertions', () => {
            assert.equal(
                transform('<rect strokeWidth={1 as const} xlinkHref={h satisfies string} fillOpacity={o!} />'),
                'createVNode(32, "rect", null, null, 1, { "stroke-width": 1, "xlink:href": h, "fill-opacity": o });'
            )
        })

        it('Should keep camelCase svg attributes on a generic component', () => {
            assert.equal(
                transform('<Icon<string> strokeWidth={2} viewBox="0 0 1 1" />'),
                'createComponentVNode(2, Icon, { "strokeWidth": 2, "viewBox": "0 0 1 1" });'
            )
        })
    })
})
