// This is a workaround for https://github.com/ajv-validator/ajv/issues/512
import _traverse from '@json-schema-tools/traverse'
import type { ErrorObject } from 'ajv'
import type { JSONSchema7 as JSONSchema } from 'json-schema'

import { deepClone } from './utils.js'

// Workaround to make it work both directly and in bundle.
const traverse = 'default' in _traverse ? _traverse.default : _traverse

const SchemaPathSymbol = Symbol('schemaPath')

/**
 * Adds {@link SchemaPathSymbol} property with JSON Path to each schema object
 * in the given `jsonSchema`. This function **mutates** the given `jsonSchema`!
 */
export function injectPathToSchemas(jsonSchema: JSONSchema, prefix?: string): void {
  prefix ??= `${jsonSchema.$id || ''}#`

  traverse(
    jsonSchema,
    (schema, _isCycle, path) => {
      if (!('$ref' in schema) && !(SchemaPathSymbol in schema)) {
        schema[SchemaPathSymbol] = `${prefix}${jsonPathToPointer(path)}`
      }
      return schema
    },
    { mutable: true },
  )

  if (typeof jsonSchema.$defs === 'object') {
    for (const [key, schema] of Object.entries(jsonSchema.$defs ?? jsonSchema.definitions)) {
      injectPathToSchemas(schema as JSONSchema, `${prefix}/$defs/${key}`)
    }
  }
}

/** @internal */
export function rewriteSchemaPathInErrors(errors: ErrorObject[], verbose: boolean): ErrorObject[] {
  return errors.map(error => {
    // The main purpose of this is to remove SchemaPathSymbol key.
    const copy = deepClone(error)
    if (error.parentSchema && SchemaPathSymbol in error.parentSchema) {
      copy.schemaPath = `${error.parentSchema[SchemaPathSymbol]}/${error.keyword}`
      if (!verbose) {
        delete copy.parentSchema
        delete copy.schema
        delete copy.data
      }
    }
    return copy
  })
}

function jsonPathToPointer(jsonPath: string): string {
  if (jsonPath.startsWith('$')) {
    jsonPath = jsonPath.slice(1)
  }
  return jsonPath
    .split('.')
    .map(s => s.replaceAll(/\[(\d+)\]/g, '/$1'))
    .join('/')
}
