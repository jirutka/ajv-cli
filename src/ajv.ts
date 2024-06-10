import * as path from 'node:path'

import Ajv7 from 'ajv'
import Ajv2019 from 'ajv/dist/2019'
import Ajv2020 from 'ajv/dist/2020'
import type AjvCore from 'ajv/dist/core'
import AjvJTD from 'ajv/dist/jtd'
import * as draft6metaSchema from 'ajv/lib/refs/json-schema-draft-06.json'
import type { ParsedArgs } from 'minimist'

import type { SchemaSpec } from './types'
import { getOptions } from './options'
import * as util from './utils'

type AjvMethod = 'addSchema' | 'addMetaSchema'

const AjvClass: { [S in SchemaSpec]?: typeof AjvCore } = {
  jtd: AjvJTD,
  draft7: Ajv7,
  draft2019: Ajv2019,
  draft2020: Ajv2020,
}

export default async function (argv: ParsedArgs): Promise<AjvCore> {
  const opts = getOptions(argv)
  if (argv.o) {
    opts.code.source = true
  }
  const Ajv: typeof AjvCore = AjvClass[argv.spec as SchemaSpec] || Ajv7
  const ajv = new Ajv(opts)
  let invalid: boolean | undefined
  if (argv.spec !== 'jtd') {
    ajv.addMetaSchema(draft6metaSchema)
  }
  addSchemas(argv.m, 'addMetaSchema', 'meta-schema')
  addSchemas(argv.r, 'addSchema', 'schema')
  customFormatsKeywords(argv.c)
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
      const schema = util.openFile(file, fileType)
      try {
        ajv[method](schema)
      } catch (err) {
        console.error(`${fileType} ${file} is invalid`)
        console.error(`error: ${(err as Error).message}`)
        invalid = true
      }
    }
  }

  function customFormatsKeywords(args: string | string[] | undefined): void {
    if (!args) {
      return
    }
    for (let file of util.getFiles(args)) {
      if (file[0] === '.') {
        file = path.resolve(process.cwd(), file)
      }
      try {
        require(file)(ajv)
      } catch (err) {
        console.error(`module ${file} is invalid; it should export function`)
        console.error(`error: ${(err as Error).message}`)
        invalid = true
      }
    }
  }
}
