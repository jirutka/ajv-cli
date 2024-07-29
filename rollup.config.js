// @ts-check
import * as FS from 'node:fs'

import cleanup from 'rollup-plugin-cleanup'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import license from 'rollup-plugin-license'
import MagicString from 'magic-string'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'

const licenseBanner = `
Name: <%= pkg.name %>
Version: <%= pkg.version %>
Author: <%= pkg.author.name %> <<%= pkg.author.email %>>
License: <%= pkg.license %> AND <%=
  _.without(_.uniq(dependencies.map(dep => dep.license.replaceAll(' ', '-'))), pkg.license).join(' AND ')
%>
Homepage: <%= pkg.homepage %>
Generated: <%= moment().format('YYYY-MM-DD') %>

Bundled dependencies:
<% for (const dep of _.sortBy(dependencies, 'name')) { %>- <%= dep.name %>@<%= dep.version %> (<%= dep.license %>)
<% } %>
`

/** @return {import('rollup').Plugin} */
const executable = () => ({
  name: 'executable',
  // NOTE: Simple `output.banner` doesn't work, it's written *after* the
  // license plugin.
  renderChunk(code, _, opts) {
    const magic = new MagicString(code)

    const match = /^#!.*$/dm.exec(code)
    if (match) {
      // If code already contains a shebang, move it to the top.
      magic.remove(match.index, match.index + match[0].length + 1)
      magic.prepend(`${match[0]}\n`)
    } else {
      magic.prepend('#!/usr/bin/env node\n')
    }

    return {
      code: magic.toString(),
      map: opts.sourcemap !== false ? magic.generateMap() : null,
    }
  },
  writeBundle(opts, bundle) {
    for (const info of Object.values(bundle)) {
      if (info.type === 'chunk') {
        FS.chmodSync(`${opts.dir}/${info.fileName}`, 0o755)
      }
    }
  },
})

/** @type {import('rollup').RollupOptions} */
const config = {
  input: './src/main.ts',
  plugins: [
    // Resolve node modules.
    resolve({
      exportConditions: ['node'],
      preferBuiltins: true,
    }),
    // Convert .json files to ESM.
    json({
      compact: true,
      preferConst: true,
    }),
    // Transpile TypeScript sources to JS.
    typescript({
      declaration: false,
      outDir: undefined,
    }),
    // Convert CommonJS modules to ESM.
    commonjs(),
    // Strip comments etc.
    cleanup({
      comments: 'none',
      extensions: ['.js', '.mjs', '.ts'],
    }),
    // Generate license banner and prepend it to the bundle.
    license({
      banner: {
        commentStyle: 'ignored',
        content: licenseBanner,
      },
    }),
    // Add shebang and set the executable bit.
    executable(),
  ],
  output: [
    {
      dir: './dist',
      entryFileNames: 'ajv.mjs',
      format: 'esm',
      inlineDynamicImports: true,
      sourcemap: true,
    },
    {
      dir: './dist',
      entryFileNames: 'ajv.cjs',
      format: 'commonjs',
      inlineDynamicImports: true,
      sourcemap: true,
    },
  ],
}

export default config
