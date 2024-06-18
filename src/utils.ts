import * as crypto from 'node:crypto'

import { glob } from './glob.js'
import reservedWords from './reserved-words.js'

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

/** Sanitises `input` to be a valid JS identifier. */
export function sanitizeId(input: string): string {
  const id = input.trim().replace(/\W+/g, '_')
  return reservedWords.has(id) || /^\d/.test(id) ? `_${id}` : id
}

export function sha1sum(data: unknown): string {
  return crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex')
}
