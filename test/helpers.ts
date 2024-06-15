import { exec, ExecException } from 'node:child_process'
import * as FS from 'node:fs'
import * as path from 'node:path'

const cwd = path.join(import.meta.dirname, '..')

export const fixturesDir = 'test/fixtures'

export async function asyncCli(
  params: string,
  callback: (error: ExecException | null, stdout: string, stderr: string) => Promise<void>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(`node dist/index ${params}`, { cwd }, (error, stdout, stderr) => {
      // eslint-disable-next-line callback-return
      callback(error, stdout, stderr).then(resolve).catch(reject)
    })
  })
}

export function cli(
  params: string,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): void {
  exec(`node dist/index ${params}`, { cwd }, callback)
}

export function readJson(filepath: string): any {
  return JSON.parse(FS.readFileSync(filepath, 'utf-8'))
}
