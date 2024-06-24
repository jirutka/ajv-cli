import { exit } from 'node:process'

import { parseArgv } from './args-parser.js'
import { commands } from './commands/index.js'
import { ProgramError, UsageError } from './errors.js'

const pkgName = '@jirutka/ajv-cli'
const pkgVersion = '6.0.0-beta.3'

async function main(argv: string[]): Promise<boolean> {
  switch (argv[0]) {
    case '--help':
    case '-h':
      return await commands.help.execute({}, [])
    case '--version':
    case '-V':
      return printVersion()
  }
  const cmdName = argv.shift() ?? ''

  if (!Object.hasOwn(commands, cmdName)) {
    throw new UsageError(`Unknown command: ${cmdName}`)
  }
  const command = commands[cmdName as keyof typeof commands]

  const [opts, args] = parseArgv({ ...command.options, ...commands.help.options }, argv)

  if (opts.help) {
    await commands.help.execute({}, [cmdName])
    return true
  }

  return await command.execute(opts as any, args)
}

function printVersion(): never {
  console.log(`${pkgName} ${pkgVersion}`)
  exit(0)
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
