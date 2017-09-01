import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import svelte from 'rollup-plugin-svelte'

const Plugins = () => [
  resolve({
    module: true, browser: true, jsnext: true, main: true, extensions: [ '.js', '.json' ]
  }),
  commonjs(),
  svelte({ cascade: false })
]

export default [
  {
    input: 'src/Drawer.html',
    output: {
      file: 'build/Drawer.js',
      format: 'es'
    },
    plugins: Plugins()
  },

  {
    input: 'src/Drawer.html',
    output: {
      file: 'build/Drawer.cjs.js',
      format: 'cjs'
    },
    plugins: Plugins()
  },

  {
    input: 'src/docs.js',
    output: {
      file: 'docs/docs.js',
      format: 'iife'
    },
    plugins: Plugins()
  }
]
