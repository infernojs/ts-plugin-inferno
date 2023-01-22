import * as ts from 'typescript'
import { sync as globSync } from 'glob'
import transform from '../src'
import { resolve, basename } from 'path'
import { readFileSync, writeFileSync } from 'fs'
// @ts-ignore
import { mkdirpSync } from 'fs-extra'

// Target is ES5 and module is UMD
const config = {
  ...ts.getDefaultCompilerOptions(),
  experimentalDecorators: true,
  jsx: ts.JsxEmit.Preserve,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.NodeJs,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES5,
  compilerOptions: {
    importsNotUsedAsValues: ['remove'],
  }
}

// Target is ES2015 (same as ES6)
const configES6 = {
  ...ts.getDefaultCompilerOptions(),
  experimentalDecorators: true,
  jsx: ts.JsxEmit.Preserve,
  noEmitOnError: false,
  noUnusedLocals: true,
  noUnusedParameters: true,
  stripInternal: true,
  target: ts.ScriptTarget.ES2015,
  compilerOptions: {
    importsNotUsedAsValues: ['remove'],
  }
}

function compile(path: string, callback) {
  const files = globSync(path)
  const compilerHost = ts.createCompilerHost(config)
  const program = ts.createProgram(files, config, compilerHost)

  program.emit(undefined, compare(), undefined, undefined, {
    before: [transform()],
  })

  callback(files, 'ES5')
}

function compileES6(path: string, callback) {
  const files = globSync(path)
  const compilerHost = ts.createCompilerHost(configES6)
  const program = ts.createProgram(files, configES6, compilerHost)

  program.emit(undefined, compare('ES6'), undefined, undefined, {
    before: [transform()],
  })

  callback(files, 'ES6')
}

let failedTestsEs5 = []
let failedTestsEs6 = []
mkdirpSync(resolve(__dirname, 'temp/'))
mkdirpSync(resolve(__dirname, 'tempES6/'))

function compare (target?: string) {
  return (filePath: string, output: string) => {
    const fileBasename = basename(filePath)
    const referenceFilePath = resolve(`${__dirname}`, `references${target ?? ''}/` + fileBasename)

    const tempFilePath = resolve(__dirname, `temp${target ?? ''}/` + fileBasename)

    try {
      const fileData = readFileSync(referenceFilePath, 'utf8')
      if (fileData !== output) {
        writeFileSync(tempFilePath, output, 'utf8');
        (target === 'ES6' ? failedTestsEs6 : failedTestsEs5).push(fileBasename)
      }
    } catch (error) {
      writeFileSync(tempFilePath, output, 'utf8');
      (target === 'ES6' ? failedTestsEs6 : failedTestsEs5).push(fileBasename)
    }
  }
}

function printResult(files: string[], target: string) {
  console.info(target ? `\n\n${target ?? ''}` : '')
  if ((target === 'ES6' ? failedTestsEs6 : failedTestsEs5).length) {
    console.log(
      `${files.length - (target === 'ES6' ? failedTestsEs6 : failedTestsEs5).length}/${files.length} cases passed`
    )
    console.log('Following tests failed:');
    (target === 'ES6' ? failedTestsEs6 : failedTestsEs5).map(test => console.log(test))
    console.log(`Please look in the test/temp${target === 'ES6' ? target : ''} folder and verify output`)
    console.log('When verified use the command: npm run overwrite-references')
    // throw 'Failed tests...'
  } else {
    console.log(`All cases (${files.length}) successfully passed`)
  }
}

function printFinalResult() {
  console.info('\n\nResults:')
  if (failedTestsEs5.length || failedTestsEs6.length) {
    console.log(`${failedTestsEs5.length} ES5 cases failed`)
    console.log(`${failedTestsEs6.length} ES6 cases failed`)
  } else {
    console.log(`All ES5 and ES6 cases successfully passed`)
  }
}

console.time('compile time')
compile('tests/cases/*.tsx', printResult)
compileES6('tests/cases/*.tsx', printResult)
printFinalResult()
console.timeEnd('compile time')
