import compile from './compile.js'
import help from './help.js'
import validate from './validate.js'

export type CmdName = keyof typeof commands

export const commands = {
  compile,
  help,
  validate,
}
