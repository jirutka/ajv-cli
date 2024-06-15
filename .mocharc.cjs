'use strict'

module.exports = {
  extension: ['js', 'ts'],
  'fail-zero': true,
  'inline-diffs': true,
  'node-option': ['enable-source-maps', 'no-warnings'],
  parallel: true,
  reporter: 'spec',
  require: ['./test/ts-loader.js'],
  slow: 300,
  spec: ['test/**/*.spec.ts'],
}
