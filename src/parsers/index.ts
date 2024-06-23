import * as FS from 'node:fs/promises'
import * as path from 'node:path'

import { ProgramError } from '../errors.js'
import * as JSON from './json.js'
import * as YAML from './yaml.js'
import type { Location, LocationRange } from '../types.js'

export type { Location, LocationRange }

export interface ParsedFile {
  readonly data: any
  readonly lines: readonly string[]
  readonly filename: string
  locate: (path: readonly string[]) => LocationRange | undefined
}

type FileType = 'json' | 'jsonc' | 'yaml'

export async function parseFile(filepath: string, fileType?: FileType): Promise<any> {
  const file = await parseFileWithMeta(filepath, fileType)
  return file.data
}

export async function parseFileWithMeta(
  filepath: string,
  fileType?: FileType,
): Promise<ParsedFile> {
  const type = fileType || path.extname(filepath).slice(1)

  let input: string
  try {
    input = await FS.readFile(filepath, 'utf-8')
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
