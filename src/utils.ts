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
