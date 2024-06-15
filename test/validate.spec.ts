import assert from 'node:assert/strict'

import type { DefinedError } from 'ajv'

import { cli, fixturesDir as fdir } from './helpers.js'

describe('validate', function () {
  this.timeout(10000)

  describe('single file validation', () => {
    it('should validate valid data', done => {
      cli(`-s ${fdir}/schema.json -d ${fdir}/valid_data.json`, (error, stdout, stderr) => {
        assert.equal(error, null)
        assert.match(stderr, /^.*\bvalid_data.json valid\s$/)
        assert.equal(stdout, '')
        done()
      })
    })

    it('should validate valid data with the "yml" extension', done => {
      cli(`-s ${fdir}/schema.json -d ${fdir}/valid_data.yml`, (error, stdout, stderr) => {
        assert.equal(error, null)
        assert.match(stderr, /^.*\bvalid_data.yml valid\s$/)
        assert.equal(stdout, '')
        done()
      })
    })

    it('should validate valid data with the "yaml" extension', done => {
      cli(`-s ${fdir}/schema.json -d ${fdir}/valid_data.yaml`, (error, stdout, stderr) => {
        assert.equal(error, null)
        assert.match(stderr, /^.*\bvalid_data.yaml valid\s$/)
        assert.equal(stdout, '')
        done()
      })
    })

    it('should validate valid data with the "jsonc" extension', done => {
      cli(`-s ${fdir}/schema.json -d ${fdir}/valid_data.jsonc`, (error, stdout, stderr) => {
        assert.equal(error, null)
        assert.match(stderr, /^.*\bvalid_data.jsonc valid\s$/)
        assert.equal(stdout, '')
        done()
      })
    })

    it('should validate invalid data', done => {
      cli(
        `-s ${fdir}/schema.json -d ${fdir}/invalid_data.json --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          assertRequiredErrors(stdout)
          done()
        },
      )
    })

    it('should print usage if syntax is invalid', done => {
      cli(`-d ${fdir}/valid_data.json`, (error, stdout, stderr) => {
        assert(error instanceof Error)
        assert.equal(stdout, '')
        assert(stderr.includes('Usage'))
        assert(stderr.includes('parameter'))
        assert(stderr.includes('required'))
        done()
      })
    })

    it('should validate valid data with JTD schema', done => {
      cli(
        `validate -s ${fdir}/jtd/schema.json -d ${fdir}/jtd/data.json --spec=jtd`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bdata.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })

    it('should validate invalid data with JTD schema', done => {
      cli(
        `validate -s ${fdir}/jtd/schema.json -d ${fdir}/jtd/invalid_data.json --spec=jtd --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          const err = JSON.parse(stdout)[0]
          assert.equal(err.keyword, 'optionalProperties')
          assert.equal(err.schemaPath, '/mapping/b')
          done()
        },
      )
    })
  })

  describe('multiple file validation', () => {
    describe('with glob', () => {
      it(`should exit without error if all files are valid`, done => {
        cli(`-s ${fdir}/schema.json -d "${fdir}/valid*.json"`, (error, stdout, stderr) => {
          assert.equal(error, null)
          assertValid(stderr, 2)
          assert.equal(stdout, '')
          done()
        })
      })

      it('should exit with error if some files are invalid', done => {
        cli(
          `-s ${fdir}/schema.json -d "${fdir}/{valid,invalid}*.json" --errors=json-oneline`,
          (error, stdout, stderr) => {
            assert(error instanceof Error)
            assert.match(stderr, /\bvalid_data\.json valid/)
            assert.match(stderr, /\bvalid_data2\.json valid/)
            assert.match(stderr, /\binvalid_data\.json invalid/)
            assert.match(stderr, /\binvalid_data2\.json invalid/)
            assertRequiredErrors(stdout, '#', 2)
            done()
          },
        )
      })
    })

    describe('with multiple files or patterns', () => {
      it('should exit without error if all files are valid', done => {
        cli(
          `-s ${fdir}/schema.json -d ${fdir}/valid_data.json -d ${fdir}/valid_data2.json`,
          (error, stdout, stderr) => {
            assert.equal(error, null)
            assert.match(stderr, /\bvalid_data\.json valid/)
            assert.match(stderr, /\bvalid_data2\.json valid/)
            assert.equal(stdout, '')
            done()
          },
        )
      })

      it('should exit with error if some files are invalid', done => {
        cli(
          `-s ${fdir}/schema.json -d ${fdir}/valid_data.json -d ${fdir}/valid_data2.json -d ${fdir}/invalid_data.json --errors=json-oneline`,
          (error, stdout, stderr) => {
            assert(error instanceof Error)
            assert.match(stderr, /\bvalid_data\.json valid/)
            assert.match(stderr, /\bvalid_data2\.json valid/)
            assert.match(stderr, /\binvalid_data\.json invalid/)
            assertRequiredErrors(stdout)
            done()
          },
        )
      })

      it('should exit with error if some files are invalid (multiple patterns)', done => {
        cli(
          `-s ${fdir}/schema.json -d "${fdir}/valid*.json" -d "${fdir}/invalid*.json" --errors=json-oneline`,
          (error, stdout, stderr) => {
            assert(error instanceof Error)
            assert.match(stderr, /\bvalid_data\.json valid/)
            assert.match(stderr, /\bvalid_data2\.json valid/)
            assert.match(stderr, /\binvalid_data\.json invalid/)
            assert.match(stderr, /\binvalid_data2\.json invalid/)
            assertRequiredErrors(stdout, '#', 2)
            done()
          },
        )
      })
    })
  })

  describe('validate schema with $ref', () => {
    it('should resolve reference and validate', done => {
      cli(
        `-s ${fdir}/schema_with_ref.json -r ${fdir}/schema.json -d ${fdir}/valid_data.json`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bvalid_data.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })

    it('should resolve reference and validate invalid data', done => {
      cli(
        `-s ${fdir}/schema_with_ref.json -r ${fdir}/schema.json -d ${fdir}/invalid_data.json --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          assertRequiredErrors(stdout, 'schema.json#')
          done()
        },
      )
    })
  })

  describe('validate with schema using added meta-schema', () => {
    it('should validate valid data', done => {
      cli(
        `-s ${fdir}/meta/schema.json -d ${fdir}/meta/valid_data.json -m ${fdir}/meta/meta_schema.json --strict=false`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bvalid_data.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })

    it('should validate invalid data', done => {
      cli(
        `-s ${fdir}/meta/schema.json -d ${fdir}/meta/invalid_data.json -m ${fdir}/meta/meta_schema.json --errors=json-oneline --strict=false`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          const err = JSON.parse(stdout)[0]
          assert.equal(err.keyword, 'type')
          assert.equal(err.instancePath, '/foo')
          assert.equal(err.schemaPath, '#/properties/foo/type')
          done()
        },
      )
    })

    it('should fail on invalid schema', done => {
      cli(
        `-s ${fdir}/meta/invalid_schema.json -d ${fdir}/meta/valid_data.json -m ${fdir}/meta/meta_schema.json --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.equal(stdout, '')
          assert.match(stderr, /^.*\binvalid_schema.json: schema is invalid/)
          assert.match(stderr, /^.*my_keyword must be boolean\s$/)
          done()
        },
      )
    })
  })

  describe('option "changes"', () => {
    it('should log changes in the object after validation', done => {
      cli(
        `-s ${fdir}/schema.json -d ${fdir}/data_with_additional.json --remove-additional  --changes=json-oneline`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bdata_with_additional.json valid\nchanges/)
          const changes = JSON.parse(stdout)
          assert.deepStrictEqual(changes, [
            { op: 'remove', path: '/1/additionalInfo' },
            { op: 'remove', path: '/0/additionalInfo' },
          ])
          done()
        },
      )
    })
  })

  describe('option "data"', () => {
    it('should exit with error when not specified in the presence of `$data` references', done => {
      cli(
        `validate -s ${fdir}/schema_with_data_reference.json -d ${fdir}/data_for_schema_with_data_reference.json`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.equal(stdout, '')
          assert(stderr.includes(`${fdir}/schema_with_data_reference.json`))
          assert(stderr.includes('invalid'))
          assert(stderr.includes('larger/minimum'))
          assert(stderr.includes('must be number'))
          done()
        },
      )
    })

    it('it should enable `$data` references when specified', done => {
      cli(
        `validate --data -s ${fdir}/schema_with_data_reference.json -d ${fdir}/data_for_schema_with_data_reference.json`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bdata_for_schema_with_data_reference.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })
  })

  describe('custom keywords', () => {
    it('should validate valid data; custom keyword definition in file', done => {
      cli(
        `validate -s ${fdir}/custom/schema.json -c ./${fdir}/custom/typeof.js -d ${fdir}/custom/valid_data.json`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bvalid_data.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })

    it('should validate valid data; custom keyword definition in package', done => {
      cli(
        `validate -s ${fdir}/custom/schema.json -c ajv-keywords/dist/keywords/typeof.js -d ${fdir}/custom/valid_data.json`,
        (error, stdout, stderr) => {
          assert.equal(error, null)
          assert.match(stderr, /^.*\bvalid_data.json valid\s$/)
          assert.equal(stdout, '')
          done()
        },
      )
    })

    it('should validate invalid data; custom keyword definition in file', done => {
      cli(
        `validate -s ${fdir}/custom/schema.json -c ./${fdir}/custom/typeof.js -d ${fdir}/custom/invalid_data.json --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          const err = JSON.parse(stdout)[0]
          assert.equal(err.keyword, 'typeof')
          assert.equal((err as DefinedError).instancePath, '')
          assert.equal((err as DefinedError).schemaPath, '#/typeof')
          done()
        },
      )
    })

    it('should validate invalid data; custom keyword definition in package', done => {
      cli(
        `validate -s ${fdir}/custom/schema.json -c ajv-keywords/dist/keywords/typeof.js -d ${fdir}/custom/invalid_data.json --errors=json-oneline`,
        (error, stdout, stderr) => {
          assert(error instanceof Error)
          assert.match(stderr, /^.*\binvalid_data.json invalid\s$/)
          const err = JSON.parse(stdout)[0]
          assert.equal(err.keyword, 'typeof')
          assert.equal((err as DefinedError).instancePath, '')
          assert.equal((err as DefinedError).schemaPath, '#/typeof')
          done()
        },
      )
    })
  })
})

function assertValid(stdout: string, count: number, extraLines = 0): string[] {
  const lines = stdout.split('\n')
  assert.equal(lines.length, count + extraLines + 1)
  for (let i = 0; i < count; i++) {
    assert.match(lines[i], /\svalid/)
  }
  return lines
}

function assertRequiredErrors(output: string, schemaRef = '#', _count = 1): void {
  for (const line of output.trim().split('\n')) {
    const err = JSON.parse(line)[0]
    assert.equal(err.keyword, 'required')
    assert.equal(err.instancePath, '/0/dimensions')
    assert.equal(err.schemaPath, schemaRef + '/items/properties/dimensions/required')
    assert.deepStrictEqual(err.params, { missingProperty: 'height' })
  }
}
