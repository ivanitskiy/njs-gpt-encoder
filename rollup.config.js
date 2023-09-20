// @ts-check
import addGitMsg from 'rollup-plugin-add-git-msg'
import babel from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import json from '@rollup/plugin-json'
import pkg from './package.json'
import replace from '@rollup/plugin-replace'
import * as fs from 'fs'
import * as path from 'path'

// List of njs built-in modules.
const njsExternals = ['crypto', 'fs', 'querystring']
// eslint-disable-next-line no-undef
const isEnvProd = process.env.NODE_ENV === 'production'

/**
 * Plugin to fix syntax of the default export to be compatible with njs.
 * (https://github.com/rollup/rollup/pull/4182#issuecomment-1002241017)
 *
 * @return {import('rollup').OutputPlugin}
 */
const fixExportDefault = () => ({
  name: 'fix-export-default',
  renderChunk: (code) => ({
    code: code.replace(/\bexport { (\S+) as default };/, 'export default $1;'),
    map: null,
  }),
})

/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
  input: 'src/index.js',
  external: njsExternals,
  plugins: [
    replace({
      preventAssignment: true,
      __encoder__: () => {
        const fileContent = fs.readFileSync(
          // eslint-disable-next-line no-undef
          path.join(path.dirname(__filename), 'assets/encoder.json'),
          'utf-8'
        )
        return JSON.stringify(fileContent)
      },
      __bpe_content__: () => {
        const fileContent = fs.readFileSync(
          // eslint-disable-next-line no-undef
          path.join(path.dirname(__filename), 'assets/vocab.bpe'),
          'utf-8'
        )

        const unicodeString = fileContent.normalize('NFC')
        // Generate a JavaScript file with the embedded content
        // const jsContent = `const embeddedContent = ${JSON.stringify(unicodeString)};\nexport default embeddedContent;`
        // fs.writeFileSync(
        //   // path.join(path.dirname(pkg.main), 'embeddedContent.js'),
        //   './src/embeddedContent.js',
        //   jsContent,
        //   'utf8'
        // )
        return JSON.stringify(unicodeString)
      },
    }),
    // // Transpile TypeScript sources to JS.
    // babel({
    //   babelHelpers: 'bundled',
    //   envName: 'njs',
    //   extensions: ['.ts', '.mjs', '.js'],
    //   // extensions: ['.ts'],
    // }),
    // Resolve node modules.
    resolve({
      extensions: ['.mjs', '.js', '.json', '.ts'],
    }),
    json(),
    // Convert CommonJS modules to ES6 modules.
    commonjs(),
    // Fix syntax of the default export.
    fixExportDefault(),

    // Plugins to use in production mode only.
    // Add git tag, commit SHA, build date and copyright at top of the file.
    ...(isEnvProd ? [addGitMsg()] : []),
  ],
  output: {
    file: pkg.main,
    format: 'es',
  },
}
export default options
