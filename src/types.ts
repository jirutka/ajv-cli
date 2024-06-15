import type { ErrorObject } from 'ajv/dist/core.js'
import type { Optional } from 'utility-types'

export type ValidationError = Optional<ErrorObject, 'keyword' | 'params' | 'propertyName'> & {
  instanceLocation?: { filename: string } & (
    | LocationRange
    | { [K in keyof LocationRange]: undefined }
  )
}

export interface LocationRange {
  start: Location
  end: Location
}

export interface Location {
  line: number
  col: number
}
