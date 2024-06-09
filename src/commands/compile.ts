import * as fs from 'node:fs'

import type { AnyValidateFunction } from 'ajv/dist/core'
import standaloneCode from 'ajv/dist/standalone'
import type { ParsedArgs } from 'minimist'

import getAjv from '../ajv'
import type { Command } from '../types'
import { getFiles, openFile } from '../utils'

const cmd: Command = {
  execute,
  schema: {
    type: 'object',
    required: ['s'],
    properties: {
      s: { $ref: '#/$defs/stringOrArray' },
      r: { $ref: '#/$defs/stringOrArray' },
      m: { $ref: '#/$defs/stringOrArray' },
      c: { $ref: '#/$defs/stringOrArray' },
      o: { anyOf: [{ type: 'string', format: 'notGlob' }, { type: 'boolean' }] },
      spec: { enum: ['draft7', 'draft2019', 'draft2020', 'jtd'] },
    },
    ajvOptions: true,
  },
}

export default cmd

async function execute(argv: ParsedArgs): Promise<boolean> {
  const ajv = await getAjv(argv)
  const schemaFiles = getFiles(argv.s)
  if ('o' in argv && schemaFiles.length > 1) {
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
      return 'o' in argv ? saveStandaloneCode(validate) : true
    }
    return false
  }

  function compileSchema(file: string): AnyValidateFunction | undefined {
    const sch = openFile(file, `schema ${file}`)
    try {
      const id = sch?.$id
      ajv.addSchema(sch, id ? undefined : file)
      const validate = ajv.getSchema(id || file)
      if (argv.o !== true) {
        console.log(`schema ${file} is valid`)
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
      const moduleCode = standaloneCode(ajv, refsOrFunc)
      try {
        if (argv.o === true) {
          console.log(moduleCode)
        } else {
          fs.writeFileSync(argv.o, moduleCode)
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
