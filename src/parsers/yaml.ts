import * as YAML from 'yaml'

import type { ParsedFile } from './index.js'

export function parse(input: string, filename: string): ParsedFile {
  const lineCounter = new YAML.LineCounter()
  const doc = YAML.parseDocument(input, { keepSourceTokens: true, lineCounter })

  return {
    data: doc.toJSON(),
    filename,
    lines: input.split('\n'),

    locate(path) {
      const node = doc.getIn(path, true) as YAML.ParsedNode | undefined
      if (node) {
        return {
          start: lineCounter.linePos(node.range[0]),
          end: lineCounter.linePos(node.range[1]),
        }
      }
    },
  }
}
