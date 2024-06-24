import compile from './compile.js'
import validate from './validate.js'

export { printHelp } from './help.js'

export type CmdName = keyof typeof commands

export const commands = {
  compile,
  validate,
}
