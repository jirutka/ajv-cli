import * as crypto from 'node:crypto'

import { glob } from './glob.js'

export function arrify<T>(value: T | readonly T[] | undefined | null): T[] {
  return (value == null ? [] : Array.isArray(value) ? value : [value]) as T[]
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

export function expandFilePaths(args: string | string[]): string[] {
  return arrify(args).flatMap(arg => glob(arg) ?? arg)
}

export function sha1sum(data: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex')
}
