import * as FS from 'node:fs'
import * as path from 'node:path'

import { ProgramError } from '../errors.js'
import * as JSON from './json.js'
import * as YAML from './yaml.js'

export interface ParsedFile {
  readonly data: any
  readonly lines: readonly string[]
  readonly filename: string
  locate: (path: readonly string[]) => LocationRange | undefined
}

export interface LocationRange {
  start: Location
  end: Location
}

export interface Location {
  line: number
  col: number
}

type FileType = 'json' | 'jsonc' | 'yaml'

export function parseFile(filepath: string, fileType?: FileType): any {
  return parseFileWithMeta(filepath, fileType).data
}

export function parseFileWithMeta(filepath: string, fileType?: FileType): ParsedFile {
  const type = fileType || path.extname(filepath).slice(1)

  let input: string
  try {
    input = FS.readFileSync(filepath, 'utf-8')
  } catch (err: any) {
    throw new ProgramError(err.message, { cause: err, exitCode: 66 })
  }
  try {
    switch (type) {
      case 'json':
        return JSON.parse(input, filepath)
      case 'jsonc':
        return JSON.parse(input, filepath, 'jsonc')
      case 'yaml':
      case 'yml':
        return YAML.parse(input, filepath)
      default:
        throw new Error(`Unsupported file type: ${type}`)
    }
  } catch (err: any) {
    throw new ProgramError(`${filepath}: ${err.message}`, { cause: err, exitCode: 65 })
  }
}
