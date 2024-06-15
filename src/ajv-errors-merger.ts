import type { ErrorObject } from 'ajv'
import type { Required } from 'utility-types'

import { getSimpleErrors } from './vendor/simple-ajv-errors/index.js'
import type { VerboseErrorObject } from './vendor/simple-ajv-errors/types.js'
import type { ValidationError } from './types.js'

export function mergeErrorObjects(
  errors: ErrorObject[],
  verbose: boolean,
): Required<ValidationError, 'message'>[] {
  return getSimpleErrors(errors as VerboseErrorObject[], { dataVar: '$' }).map(err => {
    const obj: Required<ValidationError, 'message'> = {
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
