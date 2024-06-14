import * as fs from 'node:fs'
import * as path from 'node:path'

import YAML from 'yaml'
import JSON5 from 'json5'

import { glob } from './glob.js'

function arrify<T>(value: T | readonly T[] | undefined | null): T[] {
  return (
    value == null ? []
    : Array.isArray(value) ? value
    : [value]) as T[]
}

export function deepClone<T>(input: T): T {
  if (typeof input !== 'object' || input === null) {
    return input
  }
  if (input instanceof Date) {
    return new Date(input.getTime()) as T
  }

  const cloned: any = Array.isArray(input) ? Array(input.length) : {}
  for (const key in input) {
    const value = input[key]
    cloned[key] = typeof value === 'object' && value !== null ? deepClone(value) : value
  }
  return cloned
}

export function getFiles(args: string | string[]): string[] {
  return arrify(args).reduce((files, fileOrPattern) => {
    const dataFiles = glob(fileOrPattern)
    if (dataFiles) {
      files = files.concat(dataFiles)
    } else {
      files.push(fileOrPattern)
    }
    return files
  }, [] as string[])
}

function getFormatFromFileName(filename: string): string {
  return path.extname(filename).slice(1).toLowerCase()
}

function decodeFile(contents: string, format: string): any {
  switch (format) {
    case 'json':
      return JSON.parse(contents)
    case 'jsonc':
      return JSON5.parse(contents)
    case 'yml':
    case 'yaml':
      return YAML.parse(contents)
    default:
      throw new Error(`unsupported file format ${format}`)
  }
}

export function readFile(filename: string, suffix: string): any {
  let json = null
  const file = path.resolve(process.cwd(), filename)
  try {
    const format = getFormatFromFileName(filename)
    json = decodeFile(fs.readFileSync(file).toString(), format)
  } catch (err: any) {
    const msg: string = err.message
    console.error(`error:  ${msg} ${suffix}`)
    process.exit(2)
  }
  return json
}
