import * as path from 'node:path'

import { Ajv as Ajv7 } from 'ajv'
import { Ajv2019 } from 'ajv/dist/2019.js'
import { Ajv2020 } from 'ajv/dist/2020.js'
import { Ajv as AjvJTD } from 'ajv/dist/jtd.js'
import type { ParsedArgs } from 'minimist'

import { injectPathToSchemas } from './ajv-schema-path-workaround.js'
import type { SchemaSpec } from './types.js'
import { getOptions } from './options.js'
import { parseFile } from './parsers/index.js'
import * as util from './utils.js'

type AjvCore = typeof Ajv7
type AjvMethod = 'addSchema' | 'addMetaSchema'

const draft6metaSchemaPath = import.meta.resolve('ajv/lib/refs/json-schema-draft-06.json').slice(6) // strip `file://`

const AjvClass: { [S in SchemaSpec]?: AjvCore } = {
  jtd: AjvJTD,
  draft7: Ajv7,
  draft2019: Ajv2019,
  draft2020: Ajv2020,
}

export default async function (argv: ParsedArgs): Promise<InstanceType<AjvCore>> {
  const opts = getOptions(argv)
  const isValidate = !argv._[0] || argv._[0] === 'validate'
  if (isValidate) {
    // verbose is needed for ajv-schema-path-workaround.
    opts.verbose = true
  }
  if (argv.o) {
    opts.code.source = true
  }
  const Ajv = AjvClass[argv.spec as SchemaSpec] || Ajv7
  const ajv = new Ajv(opts)
  let invalid: boolean | undefined
  if (argv.spec !== 'jtd') {
    ajv.addMetaSchema(parseFile(draft6metaSchemaPath))
  }
  addSchemas(argv.m, 'addMetaSchema', 'meta-schema')
  addSchemas(argv.r, 'addSchema', 'schema')
  await customFormatsKeywords(argv.c)
  if (invalid) {
    process.exit(1)
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
        if (isValidate && method === 'addSchema') {
          injectPathToSchemas(schema)
        }
        ajv[method](schema)
      } catch (err) {
        console.error(`${fileType} ${file} is invalid`)
        console.error(`error: ${(err as Error).message}`)
        invalid = true
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
        invalid = true
      }
    }
  }
}
