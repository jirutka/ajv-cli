import { inspect } from 'node:util'

import type { Ajv } from 'ajv'
import type { AnyValidateFunction, ErrorObject } from 'ajv/dist/core.js'
import jsonPatch from 'fast-json-patch'
import type { ParsedArgs } from 'minimist'

import { mergeErrorObjects } from '../ajv-errors-merger.js'
import { injectPathToSchemas, rewriteSchemaPathInErrors } from '../ajv-schema-path-workaround.js'
import getAjv from '../ajv.js'
import { parseFile } from '../parsers/index.js'
import type { Command } from '../types.js'
import { getFiles } from '../utils.js'

type ErrorFormat = 'js' | 'json' | 'line' | 'text'

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
    const data = parseFile(file)
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
          console.log(stringify(patch, argv.changes))
        }
      }
    } else {
      console.error(file, 'invalid')

      if (argv.errors !== 'no') {
        const output = formatErrors(validate.errors!, ajv, {
          format: argv.errors,
          merge: !!argv['merge-errors'],
          verbose: !!argv.verbose,
        })
        console.error(output)
      }
    }
    return validData
  }
}

function compileSchema(ajv: Ajv, schemaFile: string): AnyValidateFunction {
  const schema = parseFile(schemaFile)
  try {
    injectPathToSchemas(schema, '#')
    return ajv.compile(schema)
  } catch (err: any) {
    console.error(`schema ${schemaFile} is invalid`)
    console.error(`error: ${err.message}`)
    process.exit(1)
  }
}

function formatErrors(
  rawErrors: ErrorObject[],
  ajv: Ajv,
  opts: { format: ErrorFormat; merge: boolean; verbose: boolean },
): string {
  if (opts.format === 'text') {
    return ajv.errorsText(rawErrors)
  } else if (opts.merge) {
    const errors = rewriteSchemaPathInErrors(rawErrors, true)
    return stringify(mergeErrorObjects(errors, opts.verbose), opts.format)
  }
  const errors = rewriteSchemaPathInErrors(rawErrors, opts.verbose)
  return stringify(errors, opts.format)
}

function stringify(data: unknown, format: 'js' | 'json' | 'line'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, '  ')
    case 'line':
      return JSON.stringify(data)
    default:
      return inspect(data, { colors: process.stdout.isTTY, depth: 5 })
  }
}
