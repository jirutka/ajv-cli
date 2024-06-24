import { exit } from 'node:process'

import { Bool, type OptionsSchema, parseArgv } from './args-parser.js'
import { CmdName, commands, printHelp } from './commands/index.js'
import { ProgramError, UsageError } from './errors.js'

const pkgName = '@jirutka/ajv-cli'
const pkgVersion = '6.0.0-beta.3'

const globalOptions = {
  help: {
    type: Bool,
    alias: 'h',
  },
} satisfies OptionsSchema

async function main(argv: string[]): Promise<boolean> {
  switch (argv[0]) {
    case '--help':
    case '-h':
      return printHelp()
    case '--version':
    case '-V':
      return printVersion()
  }
  const cmdName = argv.shift() ?? ''

  if (!Object.hasOwn(commands, cmdName)) {
    throw new UsageError(`Unknown command: ${cmdName}`)
  }
  const command = commands[cmdName as keyof typeof commands]

  const [opts, args] = parseArgv({ ...command.options, ...globalOptions }, argv)

  if (opts.help) {
    printHelp(cmdName as CmdName)
    return true
  }

  return await command.execute(opts as any, args)
}

function printVersion(): true {
  console.log(`${pkgName} ${pkgVersion}`)
  return true
}

main(process.argv.slice(2))
  .then(ok => exit(ok ? 0 : 1))
  .catch(err => {
    if (err instanceof ProgramError) {
      console.error(`ajv: ${err.message}`)
      exit(err.exitCode)
    }
    throw err
  })
