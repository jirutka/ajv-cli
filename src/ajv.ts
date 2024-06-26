import * as path from 'node:path'

import { Ajv as Ajv7, SchemaObject, type Options as AjvOptions } from 'ajv'
import { Ajv2019 } from 'ajv/dist/2019.js'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { Ajv as AjvJTD } from 'ajv/dist/jtd.js'
import type { Required } from 'utility-types'

import { injectPathToSchemas } from './ajv-schema-path-workaround.js'
import { type CommonOptions, ajvOptionNames, schemaSpecs } from './commands/common.js'
import { ProgramError } from './errors.js'
import { parseFile } from './parsers/index.js'
import jsonSchemaDraft06 from './vendor/json-schema-draft-06.cjs'
import { expandFilePaths } from './utils.js'

type AjvCore = typeof Ajv7
type AjvMethod = 'addSchema' | 'addMetaSchema'
type JsonSchemaSpec = (typeof schemaSpecs)[number]

const ajvClasses: Record<JsonSchemaSpec, AjvCore> = {
  jtd: AjvJTD,
  draft7: Ajv7,
  draft2019: Ajv2019,
  draft2020: Ajv2020,
}

const specUris: Record<string, JsonSchemaSpec> = {
  'https://json-schema.org/draft/2020-12/schema': 'draft2020',
  'https://json-schema.org/draft/2019-09/schema': 'draft2019',
  'http://json-schema.org/draft-07/schema': 'draft7',
}

export async function initAjv(
  opts: CommonOptions,
  mode: 'compile' | 'validate',
): Promise<InstanceType<AjvCore>> {
  const spec = opts.spec || 'draft7'

  const ajvOpts = extractAjvOptions(opts)
  if (mode === 'validate') {
    // verbose is needed for ajv-schema-path-workaround.
    ajvOpts.verbose = true
  } else {
    // This is required by the standalone code generator.
    ajvOpts.code.source = true
  }
  if (ajvOpts.strict == null) {
    // Ignore unknown keywords (specification-compliant behavior).
    ajvOpts.strictSchema ??= false
  }
  // This number's been pulled out of thin air. The higher the number, the
  // longer schema compilation size and memory requirements.
  ajvOpts.inlineRefs ??= 8

  const Ajv = ajvClasses[spec]
  const ajv = new Ajv(ajvOpts)

  let invalid = 0

  if (opts.spec !== 'jtd') {
    ajv.addMetaSchema(jsonSchemaDraft06)
  }
  await addSchemas(opts.metaSchema, 'addMetaSchema', 'meta-schema')
  await addSchemas(opts.refSchema, 'addSchema', 'schema')
  await customFormatsKeywords(opts.keywords)

  if (invalid > 0) {
    throw new ProgramError(
      invalid > 1
        ? `Found ${invalid} invalid schemas or modules`
        : 'Found one invalid schema or module',
    )
  }
  return ajv

  async function addSchemas(args: string[], method: AjvMethod, fileType: string): Promise<void> {
    await Promise.all(
      expandFilePaths(args).map(async file => {
        const schema = await parseFile(file)
        try {
          if (mode === 'validate' && method === 'addSchema') {
            injectPathToSchemas(schema)
          }
          ajv[method](schema)
        } catch (err) {
          console.error(`${fileType} ${file} is invalid`)
          console.error(`error: ${(err as Error).message}`)
          invalid++
        }
      }),
    )
  }

  async function customFormatsKeywords(args: string[]): Promise<void> {
    for (let file of expandFilePaths(args)) {
      if (file[0] === '.') {
        file = path.resolve(process.cwd(), file)
      }
      try {
        const module = await import(file)
        if (typeof module.default === 'function') {
          module.default(ajv)
        } else {
          module(ajv)
        }
      } catch (err) {
        console.error(`module ${file} is invalid; it should export function`)
        console.error(`error: ${(err as Error).message}`)
        invalid++
      }
    }
  }
}

export function resolveSchemaSpec(
  schema: SchemaObject,
): Exclude<JsonSchemaSpec, 'jdt'> | undefined {
  const schemaId = schema.$schema?.replace(/#.*$/, '')

  if (schemaId && Object.hasOwn(specUris, schemaId)) {
    return specUris[schemaId]
  }
}

function extractAjvOptions(opts: CommonOptions): Required<AjvOptions, 'code'> {
  return Object.entries(opts).reduce(
    (acc, [key, value]) => {
      if (!ajvOptionNames.has(key as any)) {
        return acc
      }
      if (/^code[A-Z]/.test(key)) {
        acc.code[key[4].toLowerCase() + key.slice(5)] = value
      } else if (key === 'data') {
        acc.$data = value
      } else {
        acc[key] = value
      }
      return acc
    },
    { code: {} } as Record<string, any>,
  ) as any
}
