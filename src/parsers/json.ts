import {
  type DocumentNode,
  type Location as JsonLocation,
  type ParseOptions,
  type ValueNode,
  evaluate as evaluateAst,
  parse as parseJsonAst,
} from '@humanwhocodes/momoa'

import type { Location, ParsedFile } from './index.js'

const convertLocation = (loc: JsonLocation): Location => ({
  line: loc.line,
  col: loc.column,
})

export function parse(input: string, filename: string, mode?: 'json' | 'jsonc'): ParsedFile {
  // NOTE: JSON.parse is faster, so we parse it using momoa only when needed.
  let jsonAst: DocumentNode | undefined
  let data: unknown

  if (!mode || mode === 'json') {
    try {
      data = JSON.parse(input)
      mode = 'json'
    } catch (err) {
      if (mode === 'json' || !(err instanceof SyntaxError)) {
        throw err
      }
      mode = 'jsonc'
    }
  }
  const parseOpts: ParseOptions = { mode, ranges: false, tokens: false }

  if (mode === 'jsonc') {
    jsonAst = parseJsonAst(input, parseOpts)
    data = evaluateAst(jsonAst)
  }

  return {
    data,
    filename,
    lines: input.split('\n'),

    locate(jsonPath) {
      jsonAst ??= parseJsonAst(input, parseOpts)
      const node = getValueAtPath(jsonAst, jsonPath)
      if (node) {
        return {
          start: convertLocation(node.loc!.start),
          end: convertLocation(node.loc!.end),
        }
      }
    },
  }
}

function getValueAtPath(
  jsonAst: DocumentNode,
  jsonPath: readonly string[],
): ValueNode | undefined {
  let value = jsonAst.body

  for (const key of jsonPath) {
    switch (value.type) {
      case 'Object': {
        const filtered = value.members.filter(member => member.name.value === key)
        if (filtered.length !== 1) {
          return undefined
        }
        value = filtered[0].value
        break
      }
      case 'Array':
        value = value.elements[key as any].value
        break
      default:
        // This should not happen.
        throw new Error(`BUG: Unexpected object type: ${value.type}`)
    }
  }
  return value
}
