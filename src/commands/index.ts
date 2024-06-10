import compile from './compile.js'
import help from './help.js'
import migrate from './migrate.js'
import test from './test.js'
import type { Command, CmdName } from '../types.js'
import validate from './validate.js'

const commands: { [Name in CmdName]: Command } = {
  help,
  compile,
  validate,
  migrate,
  test,
}

export default commands
