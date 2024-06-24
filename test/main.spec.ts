import assert from 'node:assert/strict'

import { cli } from './helpers.js'

describe('main', function () {
  this.timeout(10000)

  it('should print help if --help is given', done => {
    cli('--help', (error, stdout, stderr) => {
      assert.equal(error, null)
      assert.match(stdout, /^Usage:/)
      assert.match(stdout, /^\s*ajv validate /m)
      assert.match(stdout, /^\s*ajv compile /m)
      assert.equal(stderr, '')
      done()
    })
  })

  it('should fail with message if unknown command is used', done => {
    cli('unknown', (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.equal(stdout, '')
      assert.equal(stderr, 'ajv: Unknown command: unknown\n')
      done()
    })
  })
})
