import * as fs from 'node:fs'

import type { AnyValidateFunction } from 'ajv/dist/core.js'
import standaloneCode from 'ajv/dist/standalone/index.js'

import getAjv from '../ajv.js'
import { AnyOf, Bool, type InferOptions, type OptionsSchema } from '../args-parser.js'
import { type Command, commonOptionsSchema } from './common.js'
import { parseFile } from '../parsers/index.js'
import { expandFilePaths } from '../utils.js'

const optionsSchema = {
  ...commonOptionsSchema,
  output: {
    type: AnyOf(Bool, String),
    alias: 'o',
  },
  _: {
    type: [String],
    maxItems: 0,
  },
} satisfies OptionsSchema

type Options = InferOptions<typeof optionsSchema>

export default {
  options: optionsSchema,
  execute: compile,
} satisfies Command<typeof optionsSchema>

async function compile(opts: Options, _args: string[]): Promise<boolean> {
  const ajv = await getAjv(opts, 'compile')
  const schemaFiles = expandFilePaths(opts.schema)
  if (opts.output != null && schemaFiles.length > 1) {
    return compileMultiExportModule(schemaFiles)
  }
  return schemaFiles.map(compileSchemaAndSave).every(x => x)

  function compileMultiExportModule(files: string[]): boolean {
    const validators = files.map(compileSchema)
    if (validators.every(v => v)) {
      return saveStandaloneCode(getRefs(validators as AnyValidateFunction[], files))
    }
    console.error('module not saved')
    return false
  }

  function compileSchemaAndSave(file: string): boolean {
    const validate = compileSchema(file)
    if (validate) {
      return opts.output != null ? saveStandaloneCode(validate) : true
    }
    return false
  }

  function compileSchema(file: string): AnyValidateFunction | undefined {
    const sch = parseFile(file)
    try {
      const id = sch?.$id
      ajv.addSchema(sch, id ? undefined : file)
      const validate = ajv.getSchema(id || file)
      if (opts.output !== true) {
        console.error(`schema ${file} is valid`)
      }
      return validate
    } catch (err) {
      console.error(`schema ${file} is invalid`)
      console.error(`error: ${(err as Error).message}`)
      return undefined
    }
  }

  function getRefs(
    validators: AnyValidateFunction[],
    files: string[],
  ): { [K in string]?: string } {
    return validators.reduce(
      (refs, { schema }, idx) => {
        const ref = typeof schema === 'object' ? schema.$id || files[idx] : files[idx]
        refs[ref] = ref
        return refs
      },
      {} as { [K in string]?: string },
    )
  }

  function saveStandaloneCode(
    refsOrFunc: AnyValidateFunction | { [K in string]?: string },
  ): boolean {
    try {
      const moduleCode = standaloneCode.default(ajv, refsOrFunc)
      try {
        if (opts.output === true) {
          console.log(moduleCode)
        } else {
          fs.writeFileSync(opts.output as string, moduleCode)
        }
        return true
      } catch (e) {
        console.error('error saving file:', e)
        return false
      }
    } catch (e) {
      console.error('error preparing module:', e)
      return false
    }
  }
}
