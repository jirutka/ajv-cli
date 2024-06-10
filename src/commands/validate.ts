import * as jsonPatch from 'fast-json-patch'
import type { ParsedArgs } from 'minimist'

import getAjv from './ajv'
import type { Command } from './types'
import { compile, getFiles, openFile, logJSON } from './util'

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
      errors: { enum: ['json', 'line', 'text', 'js', 'no'] },
      changes: { enum: [true, 'json', 'line', 'js'] },
      spec: { enum: ['draft7', 'draft2019', 'draft2020', 'jtd'] },
    },
    ajvOptions: true,
  },
}

export default cmd

function execute(argv: ParsedArgs): boolean {
  const ajv = getAjv(argv)
  const validate = compile(ajv, argv.s)
  return getFiles(argv.d)
    .map(validateDataFile)
    .every(x => x)

  function validateDataFile(file: string): boolean {
    const data = openFile(file, `data file ${file}`)
    let original
    if (argv.changes) original = JSON.parse(JSON.stringify(data))
    const validData = validate(data) as boolean

    if (validData) {
      console.log(file, 'valid')
      if (argv.changes) {
        const patch = jsonPatch.compare(original, data)
        if (patch.length === 0) {
          console.log('no changes')
        } else {
          console.log('changes:')
          console.log(logJSON(argv.changes, patch))
        }
      }
    } else {
      console.error(file, 'invalid')
      console.error(logJSON(argv.errors, validate.errors, ajv))
    }
    return validData
  }
}
