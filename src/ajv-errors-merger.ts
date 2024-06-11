import type { ErrorObject } from 'ajv'

import { getSimpleErrors } from './vendor/simple-ajv-errors/index.js'
import type { VerboseErrorObject } from './vendor/simple-ajv-errors/types.js'

type MergedErrorObject = Omit<ErrorObject, 'keyword' | 'params' | 'propertyName'>

export function mergeErrorObjects(errors: ErrorObject[], verbose: boolean): MergedErrorObject[] {
  return getSimpleErrors(errors as VerboseErrorObject[], { dataVar: '$' }).map(err => {
    const obj: MergedErrorObject = {
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
