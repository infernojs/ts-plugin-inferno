// Table-driven tests for src/utils/svgAttributes.ts and the attribute tables shared with babel-plugin-inferno.
// Every table entry gets its own test, so a change to a table shows up as a named test change.
// Case-sensitive SVG attributes are covered by svg-attributes.test.ts.
import {describe, it} from 'node:test'
import * as assert from 'node:assert/strict'
import {transform} from './helpers'
import svgAttributes from '../../src/utils/svgAttributes'
import {attributeTransforms, lowerCaseAttributes} from './attributeTables'

function elementProps(flags: number, tag: string, name: string) {
    return `createVNode(${flags}, "${tag}", null, null, 1, { "${name}": "v" });`
}

function componentProps(name: string) {
    return `createComponentVNode(2, Foo, { "${name}": "v" });`
}

describe('Attribute mapping tables', () => {
    describe('lowerCaseAttributes', () => {
        for (const name of lowerCaseAttributes) {
            it(`Should lowercase ${name} on elements`, () => {
                assert.equal(transform(`<div ${name}="v" />`), elementProps(1, 'div', name.toLowerCase()))
            })

            it(`Should keep ${name} on components`, () => {
                assert.equal(transform(`<Foo ${name}="v" />`), componentProps(name))
            })
        }
    })

    describe('svgAttributes', () => {
        for (const name of Object.keys(svgAttributes)) {
            it(`Should map ${name} to ${svgAttributes[name]} on elements`, () => {
                assert.equal(transform(`<rect ${name}="v" />`), elementProps(32, 'rect', svgAttributes[name]))
            })

            it(`Should keep ${name} on components`, () => {
                assert.equal(transform(`<Foo ${name}="v" />`), componentProps(name))
            })
        }
    })

    describe('attributeTransforms', () => {
        for (const name of Object.keys(attributeTransforms)) {
            it(`Should map ${name} to ${attributeTransforms[name]} on elements`, () => {
                assert.equal(transform(`<div ${name}="v" />`), elementProps(1, 'div', attributeTransforms[name]))
            })

            it(`Should keep ${name} on components`, () => {
                assert.equal(transform(`<Foo ${name}="v" />`), componentProps(name))
            })
        }
    })
})
