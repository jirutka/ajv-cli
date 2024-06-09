import { exec, ExecException } from 'node:child_process'
import * as FS from 'node:fs'
import * as path from 'node:path'

const cwd = path.join(__dirname, '..')

export function cli(
  params: string,
  callback?: (error: ExecException | null, stdout: string, stderr: string) => void,
): void {
  exec(`node dist/index ${params}`, { cwd }, callback)
}

export function readJson(filepath: string): any {
  return JSON.parse(FS.readFileSync(filepath, 'utf-8'))
}
