# ts-plugin-inferno

[![npm version](https://badge.fury.io/js/ts-plugin-inferno.svg)](https://badge.fury.io/js/ts-plugin-inferno)

Typescript JSX transformer for [InfernoJS](https://github.com/infernojs/inferno).

This is a plugin for Typescript compiler that compiles Typescript JSX syntax ( TSX ) directly to Inferno API to avoid createElement method calls.

# Install

`yarn add -D ts-plugin-inferno typescript`

## General usage

```javascript
const transformInferno = require('ts-plugin-inferno').default

// Typescript compiler options
options: {
    getCustomTransformers: () => ({
        after: [transformInferno()],
    }),
},
```

It's different depending on what bundler you're using. Please check the examples folder.

## Options

```javascript
transformInferno({
    uselessFlags: 'warn'
})
```

### uselessFlags

What to do about [useless flags](#useless-flags):

- `'warn'` (default): print a warning with `console.warn`.
- `'error'`: stop the build with an error that points at the flag. For example, CI can use it to keep useless flags out.
- `'off'`: do nothing.

Any other value throws when the plugin is created, so a typo does not turn the check off silently.
To use a different level in CI, set it where the plugin is created:

```javascript
after: [transformInferno({
    // Most CI services set CI=true
    uselessFlags: process.env.CI ? 'error' : 'warn'
})],
```

## Special flags

The plugin provides a few compile time flags that can be used to optimize an Inferno application:

```tsx
// ChildFlags
<div $HasTextChildren /> - Children is rendered as pure text
<div $HasVNodeChildren /> - Children is another vNode (Element or Component)
<div $HasNonKeyedChildren /> - Children is always an array without keys
<div $HasKeyedChildren /> - Children is an array of vNodes having unique keys
<div $ChildFlag={expression} /> - Defines the children shape at runtime, see ChildFlags in inferno-vnode-flags

// Functional flags
<div $ReCreate /> - Always remove and add the node, it can be used to replace key={Math.random()}
<div $Flags={expression} /> - Replaces the vNode flags, see VNodeFlags in inferno-vnode-flags
```

### Useless flags

Child flags are only needed for children whose shape the plugin cannot see, such as `{expression}` children or a `children={expression}` prop.
When the children are written as JSX, the plugin sets the child flags itself.
It warns about flags that cannot improve the output:

```tsx
// The children are known at compile time: the plugin already compiles them with HasVNodeChildren
<div $HasVNodeChildren>
  <h1>Hi</h1>
</div>

// Components get their children in props.children, so child flags do nothing
<Foo $HasKeyedChildren>{items}</Foo>

// Only one child flag applies. The order is $ChildFlag, $HasKeyedChildren, $HasNonKeyedChildren,
// $HasTextChildren, $HasVNodeChildren
<div $HasKeyedChildren $HasNonKeyedChildren>{items}</div>

// $Flags replaces all the vNode flags, including ReCreate
<div $ReCreate $Flags={1} />

// Fragments have no vNode flags
<Fragment $Flags={1} $ReCreate>{items}</Fragment>
```

A warning shows the file, line and column, the reason and the code around the flag:

```
ts-plugin-inferno: /project/src/App.tsx(3,10): $HasVNodeChildren is not needed: the children are known at compile time, so the plugin sets their child flags. Child flags only help with dynamic children such as {expression}.
  1 | function App() {
  2 |   return (
> 3 |     <div $HasVNodeChildren>
    |          ^^^^^^^^^^^^^^^^^
  4 |       <h1>Hi</h1>
  5 |     </div>
  6 |   );
```

With `uselessFlags: 'error'` the build fails at the first useless flag, with the same message and code.
The warnings do not change the compiled code. Remove the flags they point at, or set `uselessFlags: 'off'`.

## Breaking change in v6.0.0


Since version v6.0.0 this plugin only supports Javascript runtime environment where `Object.assign` is available.
It's also highly recommended to set typescript settings as follows

- `compilerOptions.module` to `ES2015` or `ES6` or higher.
- `commpilerOptions.target` to `ES2015` or higher



## Usage with FuseBox

Look into the `examples/fuse-box` folder and the `fuse.js` file.

You could also try to build the project by running the following commands:

`cd examples/fuse-box && npm install`

`npm run start:dev` or `npm run start:prod`

## Usage with webpack and ts-loader

Look into the `examples/webpack` folder and its webpack config.

You could also try to build the project by running the following commands:

`cd examples/webpack && npm install`

`npm run build:prod` or `npm start`

## Testing

You can run the following command to test: `npm test`

### Adding test cases

Write your test in a `.tsx` file and add it to `tests/cases`.

Compile with `npm test` and look into the `tests/temp` and verify.

Overwrite references by running the following command: `npm run overwrite-references`

Run `npm test` again to verify that all tests are passing.

## Benchmarks

`bench/` measures how much time and memory the plugin itself costs, separated from what TypeScript costs anyway.
It has no dependencies beyond the ones the tests use.

```bash
npm run bench            # every case, about 5 minutes
npm run bench:quick      # shorter runs, without the largest case
npm run bench:compare    # working tree against HEAD; pass another ref with -- --baseline <ref>
npm run bench:profile    # CPU and allocation profile of the plugin functions (case mixed-M)
node bench/run.js --help # filters, compiler options, rounds, output file
```

The plugin is built from `src/` into `bench/.cache/` for every run; a git baseline is extracted and built the same way,
so the two only differ by the plugin's code. `--baseline` also takes a directory with a built plugin, e.g. a copy of
the published package.

The cases are the same as in babel-plugin-inferno's benchmark, so the results of the two plugins compare: hand-written
components in `bench/fixtures/` (a TodoMVC app, a dashboard, an SVG icon set, an article and a TSX form) and generated
modules from `bench/generate.js`: random but seeded component trees of 200, 2,000 and 20,000 JSX nodes
(`mixed-S/M/L`), a list of 2,000 keyed children (`wide-M`) and elements nested 200 deep (`deep-M`).


## Credits

This is fork of awesome [ts-transform-inferno](https://github.com/deamme/ts-transform-inferno)!
