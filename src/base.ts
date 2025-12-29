/**
 * Generates an array of numbers within a specified range.
 *
 * If only one argument is provided, it generates a range from 0 up to (but not including) `_from`.
 * If two arguments are provided, it generates a range from `_from` up to (but not including) `_to`.
 * The optional `_step` argument specifies the increment (default is 1).
 * If `_from` is greater than `_to`, the range is generated in reverse order.
 *
 * @param _from - The start of the range, or the end if `_to` is undefined.
 * @param _to - The end of the range (not included). If omitted, range starts from 0 and ends at `_from`.
 * @param _step - The increment between numbers in the range. Must be greater than 0. Defaults to 1.
 * @returns An array of numbers representing the range.
 * @throws If `_step` is less than or equal to 0.
 * @throws If any argument is `NaN` or not finite.
 */
export function range(_from: number, _to?: number, _step: number = 1): Array<number> {
  if (_to === undefined)
    [_from, _to] = [0, _from] // If only one way
  if (Number.isNaN(_step) || !Number.isFinite(_step) || _step <= 0)
    throw new Error("_step invalid must be > 0 (swap _from and _to if you want reverse counting)")
  if (Number.isNaN(_from) || Number.isNaN(_to) || Number.isNaN(_step))
    throw new Error("can't handle NaN as value")
  if (!Number.isFinite(_from) || !Number.isFinite(_to) || !Number.isFinite(_step))
    throw new Error("can't handle infite as value")
  if (_from < _to)
    return Array.from({length: Math.ceil((_to - _from) / _step)}, (_, i) => _from + i * _step)
  else if (_from > _to)
    return Array.from({length: Math.ceil((_from - _to) / _step)}, (_, i) => _from - i * _step)
  return []
}



/**
 * ANSI escape codes for text formatting in the terminal.
 */
export const enum ANSI_ESC {
  BOLD = "\u001b[1m",
  ITALIC = "\u001b[3m",
  UNDERLINE = "\u001b[4m",
  STRIKETHROUGH = "\u001b[9m",
  RESET = "\u001b[0m",
  BLACK = "\u001b[30m",
  RED = "\u001b[31m",
  GREEN = "\u001b[32m",
  YELLOW = "\u001b[33m",
  BLUE = "\u001b[34m",
  MAGENTA = "\u001b[35m",
  CYAN = "\u001b[36m",
  WHITE = "\u001b[37m"
}
export class Out {
  silence: boolean = false
  prefix: string
  suffix: string
  printer: (... args: unknown[]) => void

  /**
   * Creates an instance of the Out class for formatted console output.
   *
   * @param _prefix - A string to prefix each output message.
   * @param _suffix - A string to suffix each output message.
   * @param _color - An optional ANSI escape code to color the prefix and suffix.
   * @param _printer - A custom printing function (defaults to console.log).
   */
  constructor(_prefix: string = "", _suffix: string = "", _color?: ANSI_ESC, _printer: (... args: unknown[]) => void = console.log) {
    this.printer = _printer
    this.prefix = _prefix
    this.suffix = _suffix
    if (_color) {
      this.prefix = _color + this.prefix + ANSI_ESC.RESET
      this.suffix = _color + this.suffix + ANSI_ESC.RESET
    }
  }

  /**
   * Prints a formatted message to the console with a timestamp, prefix, and suffix.
   *
   * @param _args - The arguments to be printed.
   */
  print(..._args: unknown[]) {
    if (!this.silence)
      this.printer(`[${new Date().toISOString()}]${this.prefix}${this.suffix}`, ..._args)
  }
}



/**
 * Retries a function multiple times with optional error handling and abort signal.
 *
 * @param _fn - The function to be retried. Can be synchronous or return a Promise.
 * @param _maxAttempts - The maximum number of attempts to execute the function.
 * @param _callbackOnError - An optional callback function to be executed after each failed attempt.
 * @param _abortSignal - An optional AbortSignal to abort the retry process.
 * @returns The result of the function if it succeeds within the allowed attempts.
 * @throws If the maximum number of attempts is exceeded or if the operation is aborted.
 */
export async function retry<T>(_fn: ()=>T, _maxAttempts: number, _callbackOnError?: ()=>unknown, _abortSignal?: AbortSignal) {
  while (--_maxAttempts >= 0 && !(_abortSignal?.aborted ?? false)) {
    try {
      return await _fn()
    } catch (err: unknown) {
      if (_maxAttempts === 0)
        throw err
      await _callbackOnError?.()
    }
  }
  if (_maxAttempts < 0)
    throw new Error("Max attempts exceeded")
  else
    throw new Error("Operation aborted")
}



/**
 * Asynchronously sleeps for a specified duration, with optional abort signal support.
 *
 * @param _ms - The number of milliseconds to sleep.
 * @param _abortSignal - An optional AbortSignal to abort the sleep.
 * @returns A Promise that resolves after the specified duration or rejects if aborted.
 */
export async function sleep(_ms: number, _abortSignal?: AbortSignal): Promise<void> {
  if (_abortSignal?.aborted)
    return Promise.reject(new Error("Sleep aborted"))
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      _abortSignal?.removeEventListener("abort", onAbort)
      resolve()
    }, _ms)

    function onAbort() {
      clearTimeout(timeout)
      _abortSignal?.removeEventListener("abort", onAbort)
      reject(new Error("Sleep aborted"))
    }
    _abortSignal?.addEventListener("abort", onAbort, { once: true })
  })
}



/**
 * Creates a scoped resource with a destructor that is called when disposed.
 *
 * @param _target - The target resource to be scoped.
 * @param _destructor - A function that will be called to clean up the resource.
 * @returns An object that implements the `Symbol.dispose` method for resource cleanup.
 * @throws If the destructor function fails during disposal.
 */
export function scoped(_target: unknown, _destructor: () => unknown) {
  return new (class {
    constructor(public readonly target: unknown, public readonly destructor: () => unknown) {}
    [Symbol.dispose]() {
      this.destructor()
    }
    async [Symbol.asyncDispose]() {
      await this.destructor()
    }
  })(_target, _destructor)
}