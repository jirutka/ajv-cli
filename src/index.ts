#! /usr/bin/env node
import minimist from 'minimist'

import { usage } from './commands/help.js'
import commands, { type CmdName } from './commands/index.js'
import { checkOptions } from './options.js'
import { ProgramError } from './errors.js'

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
        if (err instanceof ProgramError) {
          console.error(err.message)
          process.exit(err.exitCode)
        }
        throw err
      })
  }
} else {
  console.error(`Unknown command ${command}`)
  usage()
  process.exit(2)
}
