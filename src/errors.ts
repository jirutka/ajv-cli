export class ProgramError extends Error {
  readonly exitCode: number

  constructor(message: string, options: ErrorOptions & { exitCode?: number } = {}) {
    const { exitCode, ...opts } = options
    super(message, opts)
    this.exitCode = exitCode ?? 1
  }
}

export class UsageError extends ProgramError {
  override exitCode = 64
}
