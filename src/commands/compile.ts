import * as FS from 'node:fs'

import type { Ajv } from 'ajv'
import type { AnyValidateFunction } from 'ajv/dist/core.js'
import standaloneCode from 'ajv/dist/standalone/index.js'

import { initAjv } from '../ajv.js'
import { type InferOptions, type OptionsSchema } from '../args-parser.js'
import { type Command, commonOptionsSchema } from './common.js'
import { parseFile } from '../parsers/index.js'
import { expandFilePaths, sanitizeId } from '../utils.js'

const optionsSchema = {
  ...commonOptionsSchema,
  output: {
    type: String,
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
  const ajv = await initAjv(opts, 'compile')

  const schemaPaths = expandFilePaths(opts.schema)

  if (schemaPaths.length > 1) {
    // Generate multi-export module.
    const validators = schemaPaths.map(filepath => compileSchema(ajv, filepath))
    if (validators.every(v => v)) {
      return saveStandaloneCode(
        ajv,
        getRefs(validators as AnyValidateFunction[], schemaPaths, !!ajv.opts.code.esm),
        opts.output,
      )
    }
    console.error('module not saved')
  } else {
    // Generate single-export module.
    const validate = compileSchema(ajv, schemaPaths[0])
    if (validate) {
      return saveStandaloneCode(ajv, validate, opts.output)
    }
  }
  return false
}

function getRefs(
  validators: AnyValidateFunction[],
  schemaPaths: string[],
  esm: boolean,
): { [K in string]?: string } {
  return validators.reduce(
    (acc, { schema }, idx) => {
      const ref = (typeof schema === 'object' && schema.$id) || schemaPaths[idx]
      const exportName = esm ? sanitizeId(ref.replace(/\.json$/, '')) : ref
      acc[exportName] = ref
      return acc
    },
    {} as { [K in string]?: string },
  )
}

function compileSchema(ajv: Ajv, schemaPath: string): AnyValidateFunction | undefined {
  const schema = parseFile(schemaPath)
  try {
    const id = schema?.$id

    ajv.addSchema(schema, id ? undefined : schemaPath)
    const validate = ajv.getSchema(id || schemaPath)

    console.error(`schema ${schemaPath} is valid`)
    return validate
  } catch (err: any) {
    console.error(`schema ${schemaPath} is invalid`)
    console.error(`error: ${err.message}`)
    return
  }
}

function saveStandaloneCode(
  ajv: Ajv,
  refsOrFunc: AnyValidateFunction | { [K in string]?: string },
  output?: string,
): boolean {
  let moduleCode: string
  try {
    moduleCode = standaloneCode.default(ajv, refsOrFunc)
  } catch (err) {
    console.error('error preparing module:', err)
    return false
  }
  try {
    if (!output) {
      console.log(moduleCode)
    } else {
      FS.writeFileSync(output, moduleCode)
    }
    return true
  } catch (err) {
    console.error('error saving file:', err)
    return false
  }
}
