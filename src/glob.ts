import * as FS from 'node:fs'
import { join as joinPath } from 'node:path'

import picomatch, { type PicomatchOptions } from 'picomatch'

export function glob(pattern: string, options: PicomatchOptions = {}): string[] | null {
  const isFullMatch = picomatch(pattern, options)

  const state = picomatch.scan(pattern, { parts: true, tokens: true })
  if (!state.isGlob) {
    return null
  }
  const globParts = state.parts!
  const maxDepth = state.maxDepth!

  const filePaths: string[] = []

  const traverse = (dirpath: string, depth: number): void => {
    let isPrefixMatch = (input: string): boolean => {
      const dirGlob = joinPath(...globParts.slice(0, depth))
      // Replace itself - this is basically a memorization of the function result.
      isPrefixMatch = picomatch(dirGlob, options)
      return isPrefixMatch(input)
    }

    for (const dirent of FS.readdirSync(dirpath || '.', {
      encoding: 'utf-8',
      withFileTypes: true,
    })) {
      const path = joinPath(dirpath, dirent.name)

      if (dirent.isDirectory()) {
        if (!isFinite(maxDepth) || (depth < maxDepth && isPrefixMatch(path))) {
          traverse(path, depth + 1)
        }
      } else if (isFullMatch(path)) {
        filePaths.push(path)
      }
    }
  }
  traverse('', 1)

  return filePaths
}

export function isGlob(input: string): boolean {
  return picomatch.scan(input).isGlob
}
