import assert from 'node:assert/strict'

import { cli } from './helpers.js'

describe('help', function () {
  this.timeout(10000)

  it('should print help', done => {
    cli('help', (error, stdout, stderr) => {
      assert.equal(error, null)
      assert(stdout.includes('validate'))
      assert(stdout.includes('compile'))
      assert.equal(stderr, '')
      done()
    })
  })

  it('should print help for validate', done => {
    cli('help validate', (error, stdout, stderr) => {
      assert.equal(error, null)
      assert(stdout.includes('Validate'))
      assert(stdout.includes('options'))
      assert.equal(stderr, '')
      done()
    })
  })

  it('should print help for compile', done => {
    cli('help compile', (error, stdout, stderr) => {
      assert.equal(error, null)
      assert(stdout.includes('Compile'))
      assert(stdout.includes('options'))
      assert.equal(stderr, '')
      done()
    })
  })

  it('should print usage if unknown command is used', done => {
    cli('unknown', (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.equal(stdout, '')
      assert(stderr.includes('command'))
      assert(stderr.includes('Unknown'))
      assert(stderr.includes('Usage'))
      done()
    })
  })

  it('should print usage if help command is unknown', done => {
    cli('help unknown', (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.equal(stdout, '')
      assert(stderr.includes('command'))
      assert(stderr.includes('Unknown'))
      assert(stderr.includes('Usage'))
      done()
    })
  })

  it('should print usage if syntax is invalid', done => {
    cli('help --foo test/schema.json', (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.equal(stdout, '')
      assert(stderr.includes('Unknown'))
      assert(stderr.includes('Usage'))
      done()
    })
  })
})
