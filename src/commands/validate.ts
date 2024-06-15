import { inspect } from 'node:util'

import type { Ajv } from 'ajv'
import type { AnyValidateFunction, ErrorObject } from 'ajv/dist/core.js'
import jsonPatch from 'fast-json-patch'
import type { ParsedArgs } from 'minimist'
import type { Required } from 'utility-types'

import { mergeErrorObjects } from '../ajv-errors-merger.js'
import { injectPathToSchemas, rewriteSchemaPathInErrors } from '../ajv-schema-path-workaround.js'
import getAjv from '../ajv.js'
import { codespan } from '../codespan.js'
import { type Command } from './index.js'
import { type ParsedFile, parseFile, parseFileWithMeta } from '../parsers/index.js'
import { getFiles, sha1sum } from '../utils.js'
import { ProgramError } from '../errors.js'
import type { LocationRange, ValidationError } from '../types.js'

// https://docs.gitlab.com/ee/ci/testing/code_quality.html#implement-a-custom-tool
// https://github.com/codeclimate/platform/blob/master/spec/analyzers/SPEC.md#data-types
interface CodeClimateIssue {
  description: string
  check_name: string
  fingerprint: string
  severity: 'info' | 'minor' | 'major' | 'critical' | 'blocker'
  location: {
    positions?: {
      [K in 'begin' | 'end']?: {
        line: number
        column: number
      }
    }
    path: string
  }
}

const errorFormats = [
  'code-climate',
  'js',
  'json',
  'json-oneline',
  'jsonpath',
  'line',
  'pretty',
] as const
type ErrorFormat = (typeof errorFormats)[number]

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
      'errors-location': { type: 'boolean' },
      'merge-errors': { type: 'boolean' },
      errors: {
        enum: [...errorFormats, 'no'],
      },
      changes: { enum: [true, 'json', 'json-oneline', 'js'] },
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

  function validateDataFile(filepath: string): boolean {
    const file = parseFileWithMeta(filepath)
    const { data } = file

    const original = argv.changes ? JSON.parse(JSON.stringify(data)) : null
    const validData = validate(data) as boolean

    if (validData) {
      console.log(filepath, 'valid')
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
      console.error(filepath, 'invalid')

      if (argv.errors !== 'no') {
        const output = formatErrors(validate.errors!, file, {
          format: argv.errors,
          location: !!argv['errors-location'],
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
    throw new ProgramError(`${schemaFile}: ${err.message}`, { cause: err })
  }
}

function formatErrors(
  rawErrors: ErrorObject[],
  file: ParsedFile,
  opts: { format: ErrorFormat; location: boolean; merge: boolean; verbose: boolean },
): string {
  let errors: ValidationError[]

  if (opts.merge) {
    errors = mergeErrorObjects(rewriteSchemaPathInErrors(rawErrors, true), opts.verbose)
  } else {
    errors = rewriteSchemaPathInErrors(rawErrors, opts.verbose)
  }
  if (
    opts.location ||
    opts.format === 'line' ||
    opts.format === 'pretty' ||
    opts.format === 'code-climate'
  ) {
    const errorsWithLoc = withInstanceLocation(errors, file)
    const { filename } = file

    switch (opts.format) {
      case 'code-climate':
        return stringify(errorsWithLoc.map(formatCodeClimateIssue), 'json')
      case 'line': {
        return errorsWithLoc
          .map(err => {
            const { start } = err.instanceLocation
            return start ?
                `${filename}:${start.line}:${start.col} - ${err.message}`
              : `${filename} - ${err.message}`
          })
          .join('\n')
      }
      case 'pretty': {
        return errorsWithLoc
          .map(({ message, instanceLocation: location, instancePath }) => {
            if (location.start) {
              return codespan(file.lines, location as LocationRange, {
                colors: process.stdout.isTTY,
                title: `#${instancePath}`,
                filename,
                message,
              })
            }
            // This shouldn't happen...
            return `${filename}: ${message}`
          })
          .join('\n\n')
      }
    }
    errors = errorsWithLoc
  }
  if (opts.format === 'jsonpath') {
    return errors.map(err => `#${err.instancePath} - ${err.message}`).join('\n')
  }

  return stringify(errors, opts.format)
}

function formatCodeClimateIssue({
  instanceLocation: loc,
  instancePath,
  message,
}: Required<ValidationError, 'instanceLocation'>): CodeClimateIssue {
  return {
    description: `[schema] #${instancePath} ${message}`,
    check_name: 'json-schema',
    fingerprint: sha1sum([loc.filename, instancePath, message]),
    severity: 'major',
    location: {
      path: loc.filename,
      positions:
        loc.start ?
          {
            begin: {
              line: loc.start.line,
              column: loc.start.col,
            },
            end: {
              line: loc.end.line,
              column: loc.end.col,
            },
          }
        : {},
    },
  }
}

function stringify(data: unknown, format: 'js' | 'json' | 'json-oneline'): string {
  switch (format) {
    case 'json':
      return JSON.stringify(data, null, '  ')
    case 'json-oneline':
      return JSON.stringify(data)
    default:
      return inspect(data, { colors: process.stdout.isTTY, depth: 5 })
  }
}

function withInstanceLocation<T extends ValidationError>(
  errors: T[],
  file: ParsedFile,
): Required<T, 'instanceLocation'>[] {
  return errors.map(err => ({
    ...err,
    instanceLocation: {
      filename: file.filename,
      ...file.locate(err.instancePath.split('/').slice(1)),
    },
  }))
}
