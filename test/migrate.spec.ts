import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import { AnySchemaObject } from 'ajv'

import { cli, fixturesDir as fdir, readJson } from './helpers.js'

describe('migrate', function () {
  this.timeout(10000)

  it('should migrate schema to draft-07', () => {
    testMigrate(
      `migrate -s ${fdir}/migrate/schema.json -o ${fdir}/migrate/migrated_schema.json --spec=draft7`,
      `${fdir}/migrate/expected_migrated_schema.json`,
    )
  })

  it('should migrate schema to draft-07 by default', () => {
    testMigrate(
      `migrate -s ${fdir}/migrate/schema.json -o ${fdir}/migrate/migrated_schema.json`,
      `${fdir}/migrate/expected_migrated_schema.json`,
    )
  })

  it('should migrate schema to draft-2019-09', () => {
    testMigrate(
      `migrate -s ${fdir}/migrate/schema.json -o ${fdir}/migrate/migrated_schema.json --spec=draft2019`,
      `${fdir}/migrate/expected_migrated_schema_2019.json`,
    )
  })

  function testMigrate(cmd: string, expectedFile: string): void {
    try {
      deleteSchema('migrated_schema.json')
    } catch (e) {}

    cli(cmd, async (error, stdout, stderr) => {
      try {
        assert.strictEqual(error, null)
        assertMigrated(stdout, 1)
        assert.strictEqual(stderr, '')
        const migratedSchema = readSchema('migrated_schema.json')
        const expectedMigratedSchema = readJson(expectedFile)
        assert.deepStrictEqual(migratedSchema, expectedMigratedSchema)
      } finally {
        deleteSchema('migrated_schema.json')
      }
    })
  }

  it('should migrate schema to draft-07 to the same file and create backup', () => {
    const backup = fs.readFileSync(path.join(fdir, 'migrate', 'schema.json'), 'utf8')

    cli(`migrate -s ${fdir}/migrate/schema.json`, (error, stdout, stderr) => {
      try {
        assert.strictEqual(error, null)
        assertMigrated(stdout, 1)
        assert.strictEqual(stderr, '')
        const backupSchema = readSchema('schema.json.bak')
        assert.deepStrictEqual(backupSchema, JSON.parse(backup))

        const migratedSchema = readSchema('schema.json')
        const expectedMigratedSchema = readJson(`${fdir}/migrate/expected_migrated_schema.json`)
        assert.deepStrictEqual(migratedSchema, expectedMigratedSchema)
      } finally {
        fs.writeFileSync(path.join(fdir, 'migrate', 'schema.json'), backup)
        deleteSchema('schema.json.bak')
      }
    })
  })

  it('should not save schema if schema is draft-07 compatible', done => {
    cli(
      `migrate -s ${fdir}/migrate/schema_no_changes.json -o ${fdir}/migrate/migrated_schema.json`,
      (error, stdout, stderr) => {
        assert.strictEqual(error, null)
        assert.strictEqual(stderr, '')
        const lines = stdout.split('\n')
        assert.strictEqual(lines.length, 2)
        assert(/no\schanges/.test(lines[0]))
        let err
        try {
          readSchema('migrated_schema.json')
        } catch (e) {
          err = e
        }
        assert(err instanceof Error)
        done()
      },
    )
  })

  it('should fail on invalid schema', done => {
    cli(`migrate -s ${fdir}/migrate/schema_invalid.json`, (error, stdout, stderr) => {
      assert(error instanceof Error)
      assert.strictEqual(stdout, '')
      assertError(stderr)
      done()
    })
  })

  it('should fail if multiple schemas passed with -o option', done => {
    cli(
      `migrate -s "${fdir}/migrate/schema*.json"  -o ${fdir}/migrate/migrated_schema.json`,
      (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.strictEqual(stdout, '')
        assert(/multiple\sschemas/.test(stderr))
        done()
      },
    )
  })
})

function assertMigrated(stdout: string, count: number): void {
  const lines = stdout.split('\n')
  assert.strictEqual(lines.length, count + 1)
  for (let i = 0; i < count; i++) {
    assert(/saved\smigrated\sschema/.test(lines[i]))
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

function readSchema(file: string): AnySchemaObject {
  return JSON.parse(fs.readFileSync(path.join(fdir, 'migrate', file), 'utf8'))
}

function deleteSchema(file: string): void {
  fs.unlinkSync(path.join(fdir, 'migrate', file))
}
