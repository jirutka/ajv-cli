import {
  AnyOf,
  Bool,
  Const,
  Enum,
  type InferOptions,
  type OptionsSchema,
  Uint,
} from '../args-parser.js'

export const schemaSpecs = ['jtd', 'draft7', 'draft2019', 'draft2020'] as const

const ajvOptionsSchema = {
  // Ajv strict mode options
  allowMatchingProperties: Bool,
  allowUnionTypes: Bool,
  strict: AnyOf(Bool, Const('log')),
  strictNumbers: AnyOf(Bool, Const('log')),
  strictRequired: AnyOf(Bool, Const('log')),
  strictSchema: AnyOf(Bool, Const('log')),
  strictTuples: AnyOf(Bool, Const('log')),
  strictTypes: AnyOf(Bool, Const('log')),
  validateFormats: Bool,

  // Ajv validation and reporting options
  allErrors: Bool,
  comment: Bool,
  data: Bool,
  verbose: Bool,

  // Ajv options to modify validated data
  coerceTypes: AnyOf(Bool, Const('array')),
  removeAdditional: AnyOf(Bool, Enum('all', 'failing')),
  useDefaults: AnyOf(Bool, Const('empty')),

  // Ajv advanced options
  codeEs5: Bool,
  codeEsm: Bool,
  codeFormats: String,
  codeLines: Bool,
  codeOptimize: AnyOf(Bool, Uint),
  inlineRefs: AnyOf(Bool, Uint),
  loopEnum: Uint,
  loopRequired: Uint,
  messages: Bool,
  multipleOfPrecision: AnyOf(Bool, Uint),
  ownProperties: Bool,
} satisfies OptionsSchema

export const ajvOptionNames = new Set(Object.keys(ajvOptionsSchema))

export const commonOptionsSchema = {
  keywords: {
    type: [String],
    alias: 'c',
  },
  metaSchema: {
    type: [String],
    alias: 'm',
  },
  refSchema: {
    type: [String],
    alias: 'r',
  },
  schema: {
    required: true,
    type: [String],
    alias: 's',
    default: () => [] as string[],
  },
  spec: {
    type: Enum(...schemaSpecs),
  },
  ...ajvOptionsSchema,
} satisfies OptionsSchema

export type CommonOptions = InferOptions<typeof commonOptionsSchema>

export interface Command<T extends OptionsSchema> {
  execute: (opts: InferOptions<T>, args: string[]) => Promise<boolean>
  options: T
}
