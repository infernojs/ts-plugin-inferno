import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'
import typescript from 'rollup-plugin-typescript2'
import transformInferno from 'ts-plugin-inferno'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'
import terser from '@rollup/plugin-terser'

const isProd = process.env.NODE_ENV === 'production'

const tsTransformer = () => ({
  after: [transformInferno.default()]
})

const config = {
  input: 'src/index.tsx',
  plugins: [
    nodeResolve({
      jsnext: true,
      main: true
    }),
    commonjs({
      include: 'node_modules/**',
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'production'
      ),
    }),
    typescript({
      transformers: [tsTransformer],
    }),
  ],
  output: {
    file: 'dist/app.js',
    format: 'iife',
  },
}

if (!isProd) {
  config.plugins.push(
    serve({
      verbose: false,
      contentBase: '.',
      historyApiFallback: true,
      host: '0.0.0.0',
      port: 3000,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    }),
    livereload({
      watch: 'dist',
    })
  )
} else {
  config.plugins.push(terser())
}

export default config
