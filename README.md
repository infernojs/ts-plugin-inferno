# ts-plugin-inferno

[![travis](https://app.travis-ci.com/infernojs/ts-plugin-inferno.svg?branch=master)](https://app.travis-ci.com/github/infernojs/ts-plugin-inferno)
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

## Credits

This is fork of awesome [ts-transform-inferno](https://github.com/deamme/ts-transform-inferno)!
