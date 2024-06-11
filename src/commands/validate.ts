import type { Ajv } from 'ajv'
import type { AnyValidateFunction } from 'ajv/dist/core.js'
import jsonPatch from 'fast-json-patch'
import type { ParsedArgs } from 'minimist'

import { mergeErrorObjects } from '../ajv-errors-merger.js'
import { injectPathToSchemas, rewriteSchemaPathInErrors } from '../ajv-schema-path-workaround.js'
import getAjv from '../ajv.js'
import type { Command } from '../types.js'
import { getFiles, readFile } from '../utils.js'

const cmd: Command = {
  execute,
  schema: {
    type: 'object',
    required: ['s', 'd'],
    properties: {
      s: {
        type: 'string',
        format: 'notGlob',
      },
      d: { $ref: '#/$defs/stringOrArray' },
      r: { $ref: '#/$defs/stringOrArray' },
      m: { $ref: '#/$defs/stringOrArray' },
      c: { $ref: '#/$defs/stringOrArray' },
      'merge-errors': { type: 'boolean' },
      errors: { enum: ['json', 'line', 'text', 'js', 'no'] },
      changes: { enum: [true, 'json', 'line', 'js'] },
      spec: { enum: ['draft7', 'draft2019', 'draft2020', 'jtd'] },
    },
    ajvOptions: true,
  },
}

export default cmd

async function execute(argv: ParsedArgs): Promise<boolean> {
  const ajv = await getAjv(argv)
  const validate = compileSchema(ajv, argv.s)
  return getFiles(argv.d)
    .map(validateDataFile)
    .every(x => x)

  function validateDataFile(file: string): boolean {
    const data = readFile(file, `data file ${file}`)
    let original
    if (argv.changes) {
      original = JSON.parse(JSON.stringify(data))
    }
    const validData = validate(data) as boolean

    if (validData) {
      console.log(file, 'valid')
      if (argv.changes) {
        const patch = jsonPatch.compare(original, data)
        if (patch.length === 0) {
          console.log('no changes')
        } else {
          console.log('changes:')
          console.log(formatData(argv.changes, patch))
        }
      }
    } else {
      console.error(file, 'invalid')

      if (argv['merge-errors']) {
        const errors = rewriteSchemaPathInErrors(validate.errors!, true)
        console.error(formatData(argv.errors, mergeErrorObjects(errors, argv.verbose || false)))
      } else {
        const errors = rewriteSchemaPathInErrors(validate.errors!, argv.verbose)
        console.error(formatData(argv.errors, errors, ajv))
      }
    }
    return validData
  }
}

function compileSchema(ajv: Ajv, schemaFile: string): AnyValidateFunction {
  const schema = readFile(schemaFile, 'schema')
  try {
    injectPathToSchemas(schema, '#')
    return ajv.compile(schema)
  } catch (err: any) {
    console.error(`schema ${schemaFile} is invalid`)
    console.error(`error: ${err.message}`)
    process.exit(1)
  }
}

function formatData(mode: string, data: any, ajv?: Ajv): string {
  switch (mode) {
    case 'json':
      data = JSON.stringify(data, null, '  ')
      break
    case 'line':
      data = JSON.stringify(data)
      break
    case 'no':
      data = ''
      break
    case 'text':
      if (ajv) {
        data = ajv.errorsText(data)
      }
  }
  return data
}
