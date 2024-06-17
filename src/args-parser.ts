import { type Flags, type TypeFlag, typeFlag } from 'type-flag'

import { UsageError } from './errors.js'
import { arrify } from './utils.js'

export type OptionsSchema<T = Record<string, any>> = {
  [K in keyof T & string]: Flags<T>[K] & SchemaExtras
}

interface SchemaExtras {
  required?: boolean
  /** This is used only for the special `_` property (positional arguments)! */
  minItems?: number
  /** This is used only for the special `_` property (positional arguments)! */
  maxItems?: number
}

export type InferOptions<T extends OptionsSchema> = Omit<TypeFlag<T>['flags'], '_'>

// Copied from type-flag.
type FlagType<T> = ((value: any) => T) | readonly [(value: any) => T]

type FlagTypeOrSchema = OptionsSchema[string]

type OptionParser<T> = ((input: string) => T) & {
  expectedValues: string[]
  parse: (input: string) => T | undefined
}

function createOptionParser<T>(
  expectedValues: string | string[],
  parse: (input: string) => T | undefined,
): OptionParser<T> {
  const expected = arrify(expectedValues)

  // The parser is a function that throws an error on invalid value mainly for
  // compatibility with type-flag.
  const parser = (input: string): T => {
    const value = parse(input)
    if (value == null) {
      throw new TypeError(`must be ${joinCommaOr(expected)}`)
    }
    return value
  }
  parser.parse = parse
  parser.expectedValues = expected

  return parser
}

export const AnyOf =
  <T extends (OptionParser<any> | ((...args: any[]) => any))[]>(...parsers: T) =>
  (input: string): ReturnType<T[number]> => {
    for (const parser of parsers) {
      const value = 'parse' in parser ? parser.parse(input) : parser(input)
      if (value != null) {
        return value
      }
    }
    const expected = parsers.flatMap(parser =>
      'expectedValues' in parser ? parser.expectedValues : parser.name.toLowerCase(),
    )
    throw new UsageError(`must be ${joinCommaOr(expected)}`)
  }

export const Bool = createOptionParser(['true', 'false'], input => {
  switch (input) {
    case 'true':
    case '':
      return true
    case 'false':
      return false
  }
})

export const Const = <T extends string>(value: T): OptionParser<T> =>
  createOptionParser(`"${value}"`, input => (input === value ? (input as T) : undefined))

export const Enum = <T extends readonly string[]>(...members: T): OptionParser<T[number]> =>
  createOptionParser(
    members.map(s => `"${s}"`),
    input => {
      if (members.includes(input)) {
        return input
      }
    },
  )

export const Uint = createOptionParser('a positive integer', input => {
  if (/^\d+/.test(input)) {
    return Number(input)
  }
})

export function parseArgv<T extends OptionsSchema>(
  schema: T,
  argv: string[],
): [opts: InferOptions<T>, args: string[]] {
  const required: (keyof T & string)[] = []

  // Wrap type functions to wrap errors.
  const newSchema = Object.entries(schema).reduce((acc, [key, flagSchema]) => {
    if (key === '_') {
      return acc
    }
    const [type, isArray] = parseFlagType(flagSchema)
    const parse = applyParser.bind(null, type, key)

    if (flagSchema.required) {
      required.push(key)
    }
    acc[key] = {
      ...(isFlagType(flagSchema) ? {} : flagSchema),
      type: isArray ? [parse] : parse,
    }
    return acc
  }, {} as Flags) as typeof schema

  const { _: args, flags, unknownFlags } = typeFlag(newSchema, argv)

  const unknowns = Object.keys(unknownFlags).map(flag =>
    flag.length > 1 ? `--${flag}` : `-${flag}`,
  )
  if (unknowns.length > 0) {
    throw new UsageError(`Unknown options: ${unknowns.join(', ')} (see --help)`)
  }

  if ('_' in schema && !isFlagType(schema._)) {
    const schema_ = schema._
    if (schema_.minItems != null && args.length < schema_.minItems) {
      throw new UsageError('Missing required arguments')
    }
    if (schema_.maxItems != null && args.length > schema_.maxItems) {
      throw new UsageError('Too many arguments')
    }
  }

  for (const flag of required) {
    const value = flags[flag]
    if (value === undefined || (Array.isArray(value) && value.length === 0)) {
      throw new UsageError(`Missing required option: --${flag}`)
    }
  }

  return [flags, args]
}

function applyParser<T>(typeFn: (input: string) => T, option: string, value: string): T {
  try {
    return typeFn(value)
  } catch (err: any) {
    const optionDesc = [
      option.length > 1 ? '--' : '-',
      option,
      '=',
      /\s/.test(value) ? `"${value}"` : value,
    ].join('')
    throw new UsageError(`Option ${optionDesc} is invalid: value ${err.message}`)
  }
}

function isFlagType(typeOrSchema: FlagTypeOrSchema): typeOrSchema is FlagType<any> {
  return (
    typeof typeOrSchema === 'function' ||
    (Array.isArray(typeOrSchema) && typeof typeOrSchema === 'function')
  )
}

function joinCommaOr(words: string[]): string {
  if (words.length > 1) {
    return words.slice(0, -1).join(', ') + ' or ' + words.at(-1)
  }
  return words[0]
}

// Copied from https://github.com/privatenumber/type-flag/blob/v3.0.0/src/utils.ts
function parseFlagType(schema: any): [parser: (value: string) => any, isArray: boolean] {
  if (typeof schema === 'function') {
    return [schema, false]
  }
  if (Array.isArray(schema)) {
    return [schema[0], true]
  }
  return parseFlagType(schema.type)
}
