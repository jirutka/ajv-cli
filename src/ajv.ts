import * as path from 'node:path'

import { Ajv as Ajv7, type Options as AjvOptions } from 'ajv'
import { Ajv2019 } from 'ajv/dist/2019.js'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { Ajv as AjvJTD } from 'ajv/dist/jtd.js'
import type { Required } from 'utility-types'

import { injectPathToSchemas } from './ajv-schema-path-workaround.js'
import { type CommonOptions, ajvOptionNames } from './commands/common.js'
import { ProgramError } from './errors.js'
import { parseFile } from './parsers/index.js'
import * as util from './utils.js'

type AjvCore = typeof Ajv7
type AjvMethod = 'addSchema' | 'addMetaSchema'

const draft6metaSchemaPath = import.meta.resolve('ajv/lib/refs/json-schema-draft-06.json').slice(6) // strip `file://`

const AjvClass = {
  jtd: AjvJTD,
  draft7: Ajv7,
  draft2019: Ajv2019,
  draft2020: Ajv2020,
} satisfies Record<string, AjvCore>

export default async function (
  opts: CommonOptions,
  mode: 'compile' | 'validate',
): Promise<InstanceType<AjvCore>> {
  const ajvOpts = extractAjvOptions(opts)
  if (mode === 'validate') {
    // verbose is needed for ajv-schema-path-workaround.
    ajvOpts.verbose = true
  }
  if ('output' in opts && opts.output) {
    ajvOpts.code.source = true
  }
  if (ajvOpts.strict == null) {
    // Ignore unknown keywords (specification-compliant behavior).
    ajvOpts.strictSchema ??= false
  }
  // This number's been pulled out of thin air. The higher the number, the
  // longer schema compilation size and memory requirements.
  ajvOpts.inlineRefs ??= 8

  const Ajv: AjvCore = Object.hasOwn(AjvClass, opts.spec) ? AjvClass[opts.spec] : Ajv7
  const ajv = new Ajv(ajvOpts)
  let invalid = 0
  if (opts.spec !== 'jtd') {
    ajv.addMetaSchema(parseFile(draft6metaSchemaPath))
  }
  addSchemas(opts.metaSchema, 'addMetaSchema', 'meta-schema')
  addSchemas(opts.refSchema, 'addSchema', 'schema')
  await customFormatsKeywords(opts.keywords)

  if (invalid > 0) {
    throw new ProgramError(
      invalid > 1
        ? `Found ${invalid} invalid schemas or modules`
        : 'Found one invalid schema or module',
    )
  }
  return ajv

  function addSchemas(
    args: string | string[] | undefined,
    method: AjvMethod,
    fileType: string,
  ): void {
    if (!args) {
      return
    }
    for (const file of util.getFiles(args)) {
      const schema = parseFile(file)
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
    }
  }

  async function customFormatsKeywords(args: string | string[] | undefined): Promise<void> {
    if (!args) {
      return
    }
    for (let file of util.getFiles(args)) {
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

function extractAjvOptions(opts: CommonOptions): Required<AjvOptions, 'code'> {
  return Object.entries(opts).reduce(
    (acc, [key, value]) => {
      if (!ajvOptionNames.has(key as any)) {
        return acc
      }
      if (/^code[A-Z]/.test(key)) {
        acc.code[key[5].toLowerCase() + key.slice(6)] = value
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
