import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import svelte from 'rollup-plugin-svelte'

const Plugins = () => [
  resolve({
    module: true, browser: true, jsnext: true, main: true, extensions: [ '.js', '.json' ]
  }),
  commonjs(),
  svelte()
]

export default [
  {
    entry: 'src/Drawer.html',
    dest: 'build/Drawer.mjs',
    format: 'es',
    plugins: Plugins()
  },

  {
    entry: 'src/Drawer.html',
    dest: 'build/Drawer.cjs.js',
    format: 'cjs',
    plugins: Plugins()
  },

  {
    entry: 'src/docs.js',
    dest: 'docs/docs.js',
    format: 'iife',
    plugins: Plugins()
  }
]
