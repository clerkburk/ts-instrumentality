export let LAST_ERROR: Error | null = null // Only works for throws with this lib



export function key_by_val<K, V>(_map: Map<K, V[]>, _value: V): K | undefined {
  for (const [key, values] of _map.entries())
    if (values.includes(_value))
      return key
  return undefined
}



export function to_str(_x: unknown): string {
  if (typeof _x === 'string')
    return _x
  if (_x === null || _x === undefined)
    return String(_x)
  try {
    return typeof (_x as any).toString === 'function' ? to_str((_x as any).toString()) : JSON.stringify(_x)
  } catch {
    try { return JSON.stringify(_x) }
    catch { return String(_x) }
  }
}



export abstract class AnyErr extends Error {
  constructor(_msg: string) {
    super(`AnyErr->${new.target.name} because: ${_msg}`)
    Object.setPrototypeOf(this, new.target.prototype)
    LAST_ERROR = this
  }
}



export class RangeErr extends AnyErr {}
export function range(_from: number, _to?: number, _step: number = 1): Array<number> {
  if (_to === undefined)
    [_from, _to] = [0, _from] // If only one way
  if (_step <= 0)
    throw new RangeErr("_step must be > 0 (swap _from and _to if you want reverse counting)")
  if (Number.isNaN(_from) || Number.isNaN(_to) || Number.isNaN(_step))
    throw new RangeErr("can't handle NaN as value")
  if (!Number.isFinite(_from) || !Number.isFinite(_to) || !Number.isFinite(_step))
    throw new RangeErr("can't handle infite as value")
  let result: Array<number> = []
  if (_from < _to)
    for (let i = _from; i < _to; i += _step)
      result.push(i)
  else if (_from > _to)
    for (let i = _from; i > _to; i -= _step)
      result.push(i)
  return result
}



export class OrErrErr extends AnyErr {}
export function or_err<T>(_x: T | undefined | null, _msg = "value existence assertion failed"): T {
  /*
    Type assertion as safety-net before accessing
  */
  if (_x === undefined || _x === null)
    throw new OrErrErr(_msg)
  return _x
}



export class TrimErr extends AnyErr {}
export const TRIM_WITH = '...' as const
export function trim_begin(_str: string, _maxLen: number): string {
  /*
    Shorten string from the beginning if it exceeds `_maxLen`
  */
  if (_maxLen <= TRIM_WITH.length)
    throw new TrimErr(`trim_begin _maxLen too short: ${_maxLen}`)
  if (_str.length <= _maxLen)
    return _str
  return TRIM_WITH + _str.slice(_str.length - (_maxLen - TRIM_WITH.length))
}
export function trim_end(_str: string, _maxLen: number): string {
  /*
    Shorten string from the end if it exceeds `maxLen`
 */
  if (_maxLen <= TRIM_WITH.length)
    throw new TrimErr(`trim_end _maxLen too short: ${_maxLen}`)
  if (_str.length <= _maxLen)
    return _str
  return _str.slice(0, _maxLen - TRIM_WITH.length) + TRIM_WITH
}



export function time_to_str(): string {
  /*
    Returns HH:MM:SS-DD:MM:YYYY
  */
  const n = new Date()
  const p = (n: number) => n.toString().padStart(2, '0')
  return `${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}-${p(n.getDate())}:${p(n.getMonth() + 1)}:${n.getFullYear()}`
}



export async function sleep(_ms: number): Promise<void> {
  if (_ms <= 0)
    return
  return new Promise(resolve => setTimeout(resolve, _ms))
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
  readonly printer: (... args: any[]) => void

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
      this.printer(`[${time_to_str()}]${this.prefix}${this.suffix}`, ..._args)
  }
}



export function remove_all_from_arr<T>(_arr: Array<T>, _lookFor: T): void {
  let i = 0
  while (i < _arr.length)
    if (_arr.at(i) === _lookFor)
      _arr.splice(i, 1)
    else
      i++
}



export const TRY_ERROR = Symbol('TryError')
export function try_func<T, Args extends unknown[]>(_func: (...args: Args) => T, ..._args: Args): T | typeof TRY_ERROR {
  try { return _func(..._args) }
  catch (e) { return TRY_ERROR }
}



export class AssErr extends AnyErr {}
export function ass(_conditionResult: boolean): void { // ass-ert
  if (!_conditionResult)
    throw new AssErr("Assertion failed")
}



export function freezer<T extends object>(obj: T): T {
  /*
    Make an object immutable. If the object has nested
    objects, make them immutable too.
  */
  Object.freeze(obj)
  Object.getOwnPropertyNames(obj).forEach(prop => {
    const value = (obj as any)[prop]
    if (value && typeof value === 'object' && !Object.isFrozen(value))
      freezer(value)
  })
  return obj
}



export class RetryErr extends AnyErr {}
export async function retry<T, Args extends any[]>(_fn: (..._args: Args) => Promise<T> | T, _maxAttempts: number, _delayMs: number, ..._args: Args): Promise<T> {
  while (--_maxAttempts >= 0) {
    try {
      return await _fn(..._args)
    } catch (err: unknown) {
      if (_maxAttempts === 0)
        throw err
      await sleep(_delayMs)
    }
  }
  throw new RetryErr(`Invalid max attempts value ${_maxAttempts}`)
}



export class NetErr extends AnyErr {
  constructor(_msg: string, _status?: number, _statusText?: string, _otherInfo?: string) {
    super(`NetError: ${_msg}${_status ? ` (${_status})` : ''}${_statusText ? ` (${_statusText})` : ''}`)
  }
}


export async function get<T>(_url: string, _args?: Record<string, string>, _init: RequestInit = { method: 'GET' }): Promise<T> {
  /*
    Grab something out of the internet and parse it
    as JSON (or throw)
  */
  const response = await fetch(`${_url}${_args ? `?${new URLSearchParams(_args)}` : ''}`, _init)
  if (!response.ok)
    throw new NetErr(`Failed to fetch ${_url}`, response.status, response.statusText)
  return (await response.json()) as T
}



export async function post<T>(_url: string, _body: Record<string, any>, _init: RequestInit = { method: 'POST', headers: {"Content-Type": "application/json"} }): Promise<T> {
  /*
    Post something to the internet and parse it
  */
  const body = JSON.stringify(_body)
  const response = await fetch(_url, {
    ..._init,
    body,
    method: _init.method ?? 'POST'
  })
  if (!response.ok)
    throw new NetErr(`Failed to post ${_url} with init request ${_init}`, response.status, response.statusText)
  return (await response.json()) as T
}



export function scramble_name(_length: number = 64 /*~59^n possible combinations*/ ): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" as const
  return Array.from({ length: _length }, () => chars[Math.floor(Math.random() * 62)]).join("")
}