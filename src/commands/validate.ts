import { inspect } from 'node:util'

import type { Ajv } from 'ajv'
import type { AnyValidateFunction, ErrorObject } from 'ajv/dist/core.js'
import jsonPatch from 'fast-json-patch'
import type { Required } from 'utility-types'

import { injectPathToSchemas, rewriteSchemaPathInErrors } from '../ajv-schema-path-workaround.js'
import { initAjv } from '../ajv.js'
import { AnyOf, Bool, Enum, InferOptions, OptionsSchema } from '../args-parser.js'
import { codespan } from '../codespan.js'
import { type Command, commonOptionsSchema } from './common.js'
import { ProgramError } from '../errors.js'
import { type ParsedFile, parseFile, parseFileWithMeta } from '../parsers/index.js'
import { getSimpleErrors } from '../vendor/simple-ajv-errors/index.js'
import type { VerboseErrorObject } from '../vendor/simple-ajv-errors/types.js'
import { expandFilePaths, sha1sum, unescapeJsonPointer } from '../utils.js'
import type { LocationRange, ValidationError } from '../types.js'

const optionsSchema = {
  ...commonOptionsSchema,
  changes: AnyOf(Bool, Enum('json', 'json-oneline', 'js')),
  errors: {
    type: Enum('code-climate', 'js', 'json', 'json-oneline', 'jsonpath', 'line', 'pretty', 'no'),
    default: 'pretty' as const,
  },
  errorsLocation: Bool,
  mergeErrors: {
    type: Bool,
    default: true,
  },
  _: {
    type: [String],
    minItems: 1,
  },
} satisfies OptionsSchema

type Options = InferOptions<typeof optionsSchema>

type ErrorFormat = Exclude<Options['errors'], 'no'>

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

export default {
  options: optionsSchema,
  execute: validate,
} satisfies Command<typeof optionsSchema>

async function validate(opts: Options, dataFiles: string[]): Promise<boolean> {
  const ajv = await initAjv(opts, 'validate')
  const validateFn = await compileSchema(ajv, opts.schema[0])

  const results = await Promise.all(
    expandFilePaths(dataFiles).map(filepath => validateFile(validateFn, opts, filepath)),
  )
  return results.every(x => x)
}

async function validateFile(
  validateFn: AnyValidateFunction,
  opts: Options,
  filepath: string,
): Promise<boolean> {
  const file = await parseFileWithMeta(filepath)
  const { data } = file

  const original = opts.changes ? JSON.parse(JSON.stringify(data)) : null
  const isValid = validateFn(data) as boolean

  if (isValid) {
    console.error(filepath, 'valid')
    if (opts.changes) {
      const patch = jsonPatch.compare(original, data)
      if (patch.length === 0) {
        console.error('no changes')
      } else {
        console.error('changes:')
        console.log(stringify(patch, opts.changes === true ? 'js' : opts.changes))
      }
    }
  } else {
    console.error(filepath, 'invalid')

    if (opts.errors !== 'no') {
      const output = formatErrors(validateFn.errors!, file, {
        format: opts.errors,
        location: !!opts.errorsLocation,
        merge: opts.mergeErrors !== false,
        verbose: !!opts.verbose,
      })
      console.log(output)
    }
  }
  return isValid
}

async function compileSchema(ajv: Ajv, schemaFile: string): Promise<AnyValidateFunction> {
  const schema = await parseFile(schemaFile)
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
  const { format } = opts
  let errors: ValidationError[]

  if (opts.merge) {
    errors = mergeErrorObjects(rewriteSchemaPathInErrors(rawErrors, true), opts.verbose)
  } else {
    errors = rewriteSchemaPathInErrors(rawErrors, opts.verbose)
  }

  if (format === 'jsonpath') {
    return errors.map(formatJsonPath).join('\n')
  }
  if (opts.location || format === 'line' || format === 'pretty' || format === 'code-climate') {
    const errorsWithLoc = (errors = withInstanceLocation(errors, file))

    switch (format) {
      case 'code-climate':
        return stringify(errorsWithLoc.map(formatCodeClimateIssue), 'json')
      case 'line':
        return errorsWithLoc.map(formatLine).join('\n')
      case 'pretty': {
        return errorsWithLoc.map(err => formatPretty(err, file)).join('\n\n')
      }
    }
  }

  return stringify(errors, format)
}

function mergeErrorObjects(
  errors: ErrorObject[],
  verbose: boolean,
): Required<ValidationError, 'message'>[] {
  return getSimpleErrors(errors as VerboseErrorObject[], { dataVar: '$' }).map(err => {
    const obj: Required<ValidationError, 'message'> = {
      message: err.message.replace(/^.*? (?=must )/, ''),
      instancePath: err.instancePath,
      schemaPath: err.schemaPath,
    }
    if (verbose) {
      obj.data = err.data
      obj.schema = err.schema
      obj.parentSchema = err.parentSchema
    }
    return obj
  })
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
      positions: loc.start
        ? {
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

function formatJsonPath(error: ValidationError): string {
  return `#${error.instancePath} - ${error.message}`
}

function formatLine(error: Required<ValidationError, 'instanceLocation'>): string {
  const { filename, start } = error.instanceLocation
  if (!start) {
    // This shouldn't happen...
    return `${filename} - ${error.message}`
  }
  return `${filename}:${start.line}:${start.col} - ${error.message}`
}

function formatPretty(
  error: Required<ValidationError, 'instanceLocation'>,
  file: ParsedFile,
): string {
  const { instanceLocation: location, instancePath, message } = error

  if (!location.start) {
    // This shouldn't happen...
    return `${file.filename}: ${message}`
  }
  return codespan(file.lines, location as LocationRange, {
    colors: process.stdout.isTTY,
    title: `#${instancePath}`,
    filename: file.filename,
    message,
  })
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
      ...file.locate(err.instancePath.split('/').slice(1).map(unescapeJsonPointer)),
    },
  }))
}
