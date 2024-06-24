import assert from 'node:assert/strict'
import type { ExecException } from 'node:child_process'
import fs from 'node:fs'

import { asyncCli, cli, fixturesDir as fdir, tmpDir, readJson } from './helpers.js'

describe('compile', function () {
  this.timeout(10000)

  this.beforeAll(() => {
    fs.mkdirSync(tmpDir, { recursive: true })
  })

  it('should compile valid schema to stdout in CJS', done => {
    cli(`compile -s ${fdir}/schema.json`, (error, stdout, stderr) => {
      assert.equal(error, null)
      assertValid(stderr, 1)
      assert.match(stdout, /"warehouseLocation"/)
      assert.match(stdout, /\bmodule.exports\s*=/)
      done()
    })
  })

  it('should compile valid schema to stdout in ESM', done => {
    cli(`compile --code-esm -s ${fdir}/schema.json`, (error, stdout, stderr) => {
      assert.equal(error, null)
      assertValid(stderr, 1)
      assert.match(stdout, /"warehouseLocation"/)
      assert.match(stdout, /\bexport const\b/)
      assert.doesNotMatch(stdout, /\bmodule.exports\s*=/)
      done()
    })
  })

  it('should compile multiple schemas to stdout', done => {
    cli(
      `compile -s ${fdir}/schema.json -s ${fdir}/meta/schema.json -m ${fdir}/meta/meta_schema.json --strict=false`,
      (error, stdout, stderr) => {
        assert.equal(error, null)
        assertValid(stderr, 2)
        assert.match(stdout, /"warehouseLocation"/)
        assert.match(stdout, /"my_keyword"/)
        done()
      },
    )
  })

  it('should compile schema to output file in CJS', () =>
    asyncCli(
      `compile -s ${fdir}/schema.json -o ${tmpDir}/validate_schema1.cjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validate = await import(`../${tmpDir}/validate_schema1.cjs`)
        fs.unlinkSync(`${tmpDir}/validate_schema1.cjs`)

        assert.equal(error, null)
        assertValid(stderr, 1)
        assert.equal(stdout, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.equal(validate.default(validData), true)
        assert.equal(validate.default(invalidData), false)
      },
    ))

  it('should compile schema to output file in ESM', () =>
    asyncCli(
      `compile --code-esm -s ${fdir}/schema.json -o ${tmpDir}/validate_schema1.mjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validate = await import(`../${tmpDir}/validate_schema1.mjs`)
        fs.unlinkSync(`${tmpDir}/validate_schema1.mjs`)

        assert.equal(error, null)
        assertValid(stderr, 1)
        assert.equal(stdout, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.equal(validate.default(validData), true)
        assert.equal(validate.default(invalidData), false)
      },
    ))

  it('should compile multiple schemas to output file', () =>
    asyncCli(
      `compile -s ${fdir}/schema.json -s ${fdir}/schema_with_ref.json -o ${tmpDir}/validate_schema2.cjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validators = await import(`../${tmpDir}/validate_schema2.cjs`)
        fs.unlinkSync(`${tmpDir}/validate_schema2.cjs`)

        assert.equal(error, null)
        assertValid(stderr, 2)
        assert.equal(stdout, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.equal(validators['schema.json'](validData), true)
        assert.equal(validators['schema.json'](invalidData), false)
        assert.equal(validators['schema_with_ref.json'](validData), true)
        assert.equal(validators['schema_with_ref.json'](invalidData), false)
      },
    ))

  it('should compile multiple schemas to output file in ESM', () =>
    asyncCli(
      `compile --code-esm -s ${fdir}/schema.json -s ${fdir}/schema_with_ref.json -o ${tmpDir}/validate_schema2.mjs`,
      async (error, stdout, stderr) => {
        // @ts-ignore
        const validators = await import(`../${tmpDir}/validate_schema2.mjs`)
        fs.unlinkSync(`${tmpDir}/validate_schema2.mjs`)

        assert.equal(error, null)
        assertValid(stderr, 2)
        assert.equal(stdout, '')

        const validData = readJson(`${fdir}/valid_data.json`)
        const invalidData = readJson(`${fdir}/invalid_data.json`)
        assert.equal(validators.schema(validData), true)
        assert.equal(validators.schema(invalidData), false)
        assert.equal(validators.schema_with_ref(validData), true)
        assert.equal(validators.schema_with_ref(invalidData), false)
      },
    ))

  it('should compile valid schema with a custom meta-schema to stdout', done => {
    cli(
      `compile -s ${fdir}/meta/schema.json -m ${fdir}/meta/meta_schema.json --strict=false`,
      (error, stdout, stderr) => {
        assert.equal(error, null)
        assertValid(stderr, 1)
        assert.match(stdout, /"my_keyword"/)
        done()
      },
    )
  })

  it('should compile schema with custom keyword', () =>
    asyncCli(
      `compile -s ${fdir}/custom/schema.json -c ./${fdir}/custom/typeof.js -o ${tmpDir}/validate_schema.cjs`,
      assertCompiledCustom,
    ))

  it('should compile schema with custom keyword from npm package', () =>
    asyncCli(
      `compile -s ${fdir}/custom/schema.json -c ajv-keywords/dist/keywords/typeof.js -o ${tmpDir}/validate_schema.cjs`,
      assertCompiledCustom,
    ))

  it('should fail to compile invalid schema with a custom meta-schema', done => {
    cli(
      `compile -s ${fdir}/meta/invalid_schema.json -m ${fdir}/meta/meta_schema.json`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.equal(stdout, '')
        const lines = assertError(stderr)
        assert.match(lines[1], /my_keyword\smust\sbe\sboolean/)
        done()
      },
    )
  })

  it('should fail to save compiled schemas when path does not exist', done => {
    cli(
      `compile -s ${fdir}/schema.json -o no_folder/validate_schema.cjs`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.equal(stdout, '')
        const lines = stderr.split('\n')
        assert(lines.length > 1)
        assert.match(lines[0], /schema .* is valid/)
        assert.match(lines[1], /error\ssaving\sfile/)
        done()
      },
    )
  })

  it('should fail to compile if referenced schema is invalid', done => {
    cli(
      `compile -s ${fdir}/schema.json -r ${fdir}/meta/invalid_schema2.json`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.equal(stdout, '')
        const lines = assertError(stderr)
        assert.match(lines[0], /schema\s.*\sis\sinvalid/)
        done()
      },
    )
  })

  it('should fail to compile if custom package does not export function', done => {
    cli(
      `compile -s ${fdir}/custom/schema.json -c ${fdir}/custom/invalid_custom.js`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.equal(stdout, '')
        const lines = stderr.split('\n')
        assert.match(lines[0], /module.*is\sinvalid.*should\sexport\sfunction/)
        done()
      },
    )
  })

  it('should fail with message if too many arguments are given', done => {
    cli(`compile file -s ${fdir}/schema.json`, (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.equal(stdout, '')
      assert.equal(stderr, 'ajv: Too many arguments\n')
      done()
    })
  })

  it('should compile JTD schema to stdout', done => {
    cli(`compile -s ${fdir}/jtd/schema.json --spec=jtd`, (error, stdout, stderr) => {
      assert.equal(error, null)
      assertValid(stderr, 1)
      assert.match(stdout, /"timestamp"/)
      done()
    })
  })
})

function assertValid(stdout: string, count: number): void {
  const lines = stdout.split('\n')
  assert.equal(lines.length, count + 1)
  for (let i = 0; i < count; i++) {
    assert.match(lines[i], /\svalid/)
  }
}

function assertError(stderr: string): string[] {
  const lines = stderr.split('\n')
  assert(lines[0].includes('schema'))
  assert.match(lines[0], /\sinvalid/)
  assert(lines[1].includes('error'))
  return lines
}

async function assertCompiledCustom(
  error: ExecException | null,
  stdout: string,
  stderr: string,
): Promise<void> {
  assert.equal(error, null)
  assertValid(stderr, 1)
  assert.equal(stdout, '')

  // @ts-ignore
  const validate = await import(`../${tmpDir}/validate_schema.cjs`)
  const validData = readJson(`${fdir}/custom/valid_data.json`)
  const invalidData = readJson(`${fdir}/custom/invalid_data.json`)
  assert.equal(validate.default(validData), true)
  assert.equal(validate.default(invalidData), false)

  fs.unlinkSync(`${tmpDir}/validate_schema.cjs`)
}
