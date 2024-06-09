import compile from './compile'
import help from './help'
import migrate from './migrate'
import test from './test'
import type { Command, CmdName } from '../types'
import validate from './validate'

const commands: { [Name in CmdName]: Command } = {
  help,
  compile,
  validate,
  migrate,
  test,
}

export default commands
