import assert from 'node:assert/strict'
import type { ExecException } from 'node:child_process'
import fs from 'node:fs'

import { asyncCli, cli, fixturesDir as fdir, readJson } from './helpers.js'

describe('compile', function () {
  this.timeout(10000)

  it('should compile valid schema', done => {
    cli(`compile -s ${fdir}/schema.json`, (error, stdout, stderr) => {
      assert.strictEqual(error, null)
      assertValid(stdout, 1)
      assert.strictEqual(stderr, '')
      done()
    })
  })

  it('should compile multiple schemas', done => {
    cli(
      `compile -s ${fdir}/schema.json -s ${fdir}/meta/schema.json -m ${fdir}/meta/meta_schema.json --strict=false`,
      (error, stdout, stderr) => {
        assert.strictEqual(error, null)
        assertValid(stdout, 2)
        assert.strictEqual(stderr, '')
        done()
      },
    )
  })

  it('should compile schema to output file', () =>
    asyncCli(
      `compile -s ${fdir}/schema.json -o ${fdir}/validate_schema1.cjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validate = await import('./fixtures/validate_schema1.cjs')
        fs.unlinkSync(`${fdir}/validate_schema1.cjs`)

        assert.strictEqual(error, null)
        assertValid(stdout, 1)
        assert.strictEqual(stderr, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.strictEqual(validate.default(validData), true)
        assert.strictEqual(validate.default(invalidData), false)
      },
    ))

  it('should compile multiple schemas to output file', () =>
    asyncCli(
      `compile -s ${fdir}/schema.json -s ${fdir}/schema_with_ref.json -o ${fdir}/validate_schema2.cjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validators = await import('./fixtures/validate_schema2.cjs')
        fs.unlinkSync(`${fdir}/validate_schema2.cjs`)

        assert.strictEqual(error, null)
        assertValid(stdout, 2)
        assert.strictEqual(stderr, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.strictEqual(validators['schema.json'](validData), true)
        assert.strictEqual(validators['schema.json'](invalidData), false)
        assert.strictEqual(validators['schema_with_ref.json'](validData), true)
        assert.strictEqual(validators['schema_with_ref.json'](invalidData), false)
      },
    ))

  it('should compile valid schema with a custom meta-schema', done => {
    cli(
      `compile -s ${fdir}/meta/schema.json -m ${fdir}/meta/meta_schema.json --strict=false`,
      (error, stdout, stderr) => {
        assert.strictEqual(error, null)
        assertValid(stdout, 1)
        assert.strictEqual(stderr, '')
        done()
      },
    )
  })

  it('should compile schema with custom keyword', () =>
    asyncCli(
      `compile -s ${fdir}/custom/schema.json -c ./${fdir}/custom/typeof.js -o ./${fdir}/custom/validate_schema.cjs`,
      assertCompiledCustom,
    ))

  it('should compile schema with custom keyword from npm package', () =>
    asyncCli(
      `compile -s ${fdir}/custom/schema.json -c ajv-keywords/dist/keywords/typeof.js -o ${fdir}/custom/validate_schema.cjs`,
      assertCompiledCustom,
    ))

  it('should fail to compile invalid schema with a custom meta-schema', done => {
    cli(
      `compile -s ${fdir}/meta/invalid_schema.json -m ${fdir}/meta/meta_schema.json`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.strictEqual(stdout, '')
        const lines = assertError(stderr)
        assert(/my_keyword\smust\sbe\sboolean/.test(lines[1]))
        done()
      },
    )
  })

  it('should fail to save compiled schemas when path does not exist', done => {
    cli(
      `compile -s ${fdir}/schema.json -o no_folder/validate_schema.cjs`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assertValid(stdout, 1)
        const lines = stderr.split('\n')
        assert(lines.length > 1)
        assert(/error\ssaving\sfile/.test(lines[0]))
        done()
      },
    )
  })

  it('should fail to compile if referenced schema is invalid', done => {
    cli(
      `compile -s ${fdir}/schema.json -r ${fdir}/meta/invalid_schema2.json`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.strictEqual(stdout, '')
        const lines = assertError(stderr)
        assert(/schema\s.*\sis\sinvalid/.test(lines[0]))
        done()
      },
    )
  })

  it('should fail to compile if custom package does not export function', done => {
    cli(
      `compile -s ${fdir}/custom/schema.json -c ${fdir}/custom/invalid_custom.js`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.strictEqual(stdout, '')
        const lines = stderr.split('\n')
        assert(/module.*is\sinvalid.*should\sexport\sfunction/.test(lines[0]))
        done()
      },
    )
  })

  it('should fail if output file is glob', done => {
    cli(`compile -s ${fdir}/schema.json -o ${fdir}/*.foo`, (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert(stderr.includes('only one file is allowed'))
      assert(stderr.includes('usage'))
      assert.strictEqual(stdout, '')
      done()
    })
  })

  it('should fail if too many parameters', done => {
    cli(`compile file -s ${fdir}/schema.json`, (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert(stderr.includes('too many arguments'))
      assert(stderr.includes('usage'))
      assert.strictEqual(stdout, '')
      done()
    })
  })

  it('should compile JTD schema', done => {
    cli(`compile -s ${fdir}/jtd/schema.json --spec=jtd`, (error, stdout, stderr) => {
      assert.strictEqual(error, null)
      assertValid(stdout, 1)
      assert.strictEqual(stderr, '')
      done()
    })
  })
})

function assertValid(stdout: string, count: number): void {
  const lines = stdout.split('\n')
  assert.strictEqual(lines.length, count + 1)
  for (let i = 0; i < count; i++) {
    assert(/\svalid/.test(lines[i]))
  }
}

function assertError(stderr: string): string[] {
  const lines = stderr.split('\n')
  assert.strictEqual(lines.length, 3)
  assert(lines[0].includes('schema'))
  assert(/\sinvalid/.test(lines[0]))
  assert(lines[1].includes('error'))
  return lines
}

async function assertCompiledCustom(
  error: ExecException | null,
  stdout: string,
  stderr: string,
): Promise<void> {
  assert.strictEqual(error, null)
  assertValid(stdout, 1)
  assert.strictEqual(stderr, '')

  // @ts-ignore
  const validate = await import('./fixtures/custom/validate_schema.cjs')
  const validData = readJson(`${fdir}/custom/valid_data.json`)
  const invalidData = readJson(`${fdir}/custom/invalid_data.json`)
  assert.strictEqual(validate.default(validData), true)
  assert.strictEqual(validate.default(invalidData), false)

  fs.unlinkSync(`${fdir}/custom/validate_schema.cjs`)
}
