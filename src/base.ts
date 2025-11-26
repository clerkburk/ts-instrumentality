export function range(_from: number, _to?: number, _step: number = 1): Array<number> {
  if (_to === undefined)
    [_from, _to] = [0, _from] // If only one way
  if (_step <= 0)
    throw new Error("_step must be > 0 (swap _from and _to if you want reverse counting)")
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
  printer: (... args: any[]) => void

  constructor(_prefix?: string, _suffix?: string, _color?: ANSI_ESC, _printer?: (... args: any[]) => void) {
    this.printer = _printer ?? console.log
    this.prefix = _prefix ?? ""
    this.suffix = _suffix ?? ""
    if (_color) {
      this.prefix = _color + this.prefix + ANSI_ESC.RESET
      this.suffix = _color + this.suffix + ANSI_ESC.RESET
    }
  }

  print(..._args: unknown[]) {
    if (!this.silence)
      this.printer(`[${new Date().toISOString()}]${this.prefix}${this.suffix}`, ..._args)
  }
}



export async function retry<T, Args extends any[]>(_fn: (..._args: Args) => Promise<T> | T, _maxAttempts: number, _delayMs: number, ..._args: Args): Promise<T> {
  while (--_maxAttempts >= 0) {
    try {
      return await _fn(..._args)
    } catch (err: unknown) {
      if (_maxAttempts === 0)
        throw err
      await new Promise(r => setTimeout(r, _delayMs))
    }
  }
  throw new Error(`Invalid max attempts value ${_maxAttempts}`)
}



export async function sleep(_ms: number, _abortSignal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      _abortSignal?.removeEventListener("abort", onAbort)
      resolve()
    }, _ms)

    function onAbort() {
      clearTimeout(timeout)
      reject(new Error("Sleep aborted"))
    }
    _abortSignal?.addEventListener("abort", onAbort, { once: true })
  })
}
export function sleep_sync(_ms: number): void {
  const end = Date.now() + _ms
  while (Date.now() < end) { /* busy wait */ }
}



import { createHash } from "crypto"
export function hash(_str: string, _algorithm: string = "sha256"): string {
  return createHash(_algorithm).update(_str).digest("hex")
}