import type { SchemaObject } from 'ajv'
import type { ParsedArgs } from 'minimist'

import compile from './compile.js'
import help from './help.js'
import validate from './validate.js'

export interface Command {
  execute: (argv: ParsedArgs) => Promise<boolean>
  schema: SchemaObject
}

export type CmdName = keyof typeof commands

const commands = {
  help,
  compile,
  validate,
} satisfies Record<string, Command>

export default commands
