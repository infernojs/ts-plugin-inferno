import type {Component} from 'inferno'

export function isComp(a: unknown): a is Component {
    return a.toString() === 'import-type-only-test'
}
