#! /usr/bin/env node
import * as minimist from 'minimist'

import commands from './commands'
import usage from './commands/usage'
import type { CmdName } from './types'
import { checkOptions } from './options'

const argv = minimist(process.argv.slice(2))
const command = argv._[0] || 'validate'
if (command in commands) {
  const cmd = commands[command as CmdName]
  const errors = checkOptions(cmd.schema, argv)
  if (errors) {
    console.error(errors)
    usage()
    process.exit(2)
  } else {
    cmd
      .execute(argv)
      .then(ok => process.exit(ok ? 0 : 1))
      .catch(err => {
        throw err
      })
  }
} else {
  console.error(`Unknown command ${command}`)
  usage()
  process.exit(2)
}
