#!/usr/bin/env node
import { exit } from 'node:process'

import minimist from 'minimist'

import { usage } from './commands/help.js'
import commands, { type CmdName } from './commands/index.js'
import { checkOptions } from './options.js'
import { ProgramError } from './errors.js'

const pkgName = '@jirutka/ajv-cli'
const pkgVersion = '6.0.0-beta.0'

function main(argv: string[]): void {
  const opts = minimist(argv)
  const cmdName = opts._[0] || 'validate'

  if (opts.version || opts.V) {
    console.log(`${pkgName} ${pkgVersion}`)
    exit(0)
  }

  if (!Object.hasOwn(commands, cmdName)) {
    console.error(`Unknown command ${cmdName}`)
    usage()
    exit(2)
  }
  const cmd = commands[cmdName as CmdName]

  const errors = checkOptions(cmd.schema, opts)
  if (errors) {
    console.error(errors)
    usage()
    exit(2)
  }

  cmd
    .execute(opts)
    .then(ok => exit(ok ? 0 : 1))
    .catch(err => {
      if (err instanceof ProgramError) {
        console.error(err.message)
        exit(err.exitCode)
      }
      throw err
    })
}

main(process.argv.slice(2))
