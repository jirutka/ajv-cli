import compile from './compile.js'
import help from './help.js'
import migrate from './migrate.js'
import type { Command, CmdName } from '../types.js'
import validate from './validate.js'

const commands: { [Name in CmdName]: Command } = {
  help,
  compile,
  validate,
  migrate,
}

export default commands
