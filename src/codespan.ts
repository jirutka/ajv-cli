import { Chalk } from 'chalk'

import type { LocationRange } from './parsers/index.js'

interface Options {
  colors?: boolean
  filename?: string
  linesAbove?: number
  linesBelow?: number
  maxLineWidth?: number
  message?: string
  title?: string
}

export function codespan(
  rawLines: readonly string[],
  location: LocationRange,
  opts: Options,
): string {
  const { start, end } = location
  const { linesAbove = 3, linesBelow = 3, message = '' } = opts

  const leftPadding = Math.max(String(end.line).length, 3)
  const maxLineWidth = (opts.maxLineWidth ?? 80) - leftPadding - 3

  const chalk = new Chalk({ level: opts.colors ? 3 : 0 })

  const leftColumnWithLno = (lno?: number): string => {
    return chalk.blue(String(lno ?? '').padStart(leftPadding, ' ') + ' | ')
  }
  const leftColumn = leftColumnWithLno()

  const out = []

  if (opts.filename) {
    const line = chalk.red.bold(`--> ${opts.filename}:${start.line}:${start.col}`)
    out.push(line)
  }
  if (opts.title) {
    out.push(' '.repeat(4) + chalk.cyan(opts.title))
    out.push('')
  }

  const startLno = Math.max(1, start.line - linesAbove)
  const endLno = Math.min(end.line + linesBelow, rawLines.length)

  for (let lno = startLno; lno <= endLno; lno++) {
    let line = rawLines[lno - 1]

    if (lno >= start.line && lno <= end.line) {
      const colStart = lno === start.line ? start.col - 1 : 0
      const colEnd = lno === end.line ? end.col - 1 : -1

      if (maxLineWidth > 0 && colEnd > 0) {
        line = ellipsis(line, Math.max(maxLineWidth, colEnd + 4))
      }
      line = mapSubstr(line, colStart, colEnd, chalk.red.bold)

      out.push(leftColumnWithLno(lno) + line)
    } else {
      out.push(leftColumn + chalk.gray(ellipsis(line, maxLineWidth)))
    }

    if (lno === end.line) {
      const highlight =
        ' '.repeat(start.col - 1) +
        chalk.red.bold('^'.repeat(Math.max(1, end.col - start.col)) + ' ' + message)
      out.push(leftColumn + highlight)
    }
  }

  return out.join('\n')
}

function ellipsis(text: string, maxLength: number): string {
  if (maxLength > 0 && text.length > maxLength) {
    return text.slice(0, maxLength - 3) + '...'
  }
  return text
}

function mapSubstr(text: string, start: number, end: number, fn: (str: string) => string): string {
  const before = text.slice(0, Math.max(start, 0))
  const substr = text.slice(start, end)
  const after = end >= 0 ? text.slice(end) : ''

  return `${before}${fn(substr)}${after}`
}
