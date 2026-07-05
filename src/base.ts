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
export function range(_from: number, _to?: number, _step: number = 1): number[] {
  if (_to === undefined)
    [_from, _to] = [0, _from] // If only one way
  if (!Number.isFinite(_from) || !Number.isFinite(_to) || !Number.isFinite(_step))
    throw new Error("Arguments must be finite numbers")
  if (_step <= 0)
    throw new Error("_step must be greater than 0")
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



/**
 * Retries a function multiple times with optional error handling and abort signal.
 *
 * @param _fn - The function to be retried.
 * @param _maxAttempts - The maximum number of attempts to execute the function.
 * @param _cbErr - An optional callback function to be executed after each failed attempt.
 * @param _abs - An optional AbortSignal to abort the retry process.
 * @returns The result of the function if it succeeds within the allowed attempts.
 * @throws If the maximum number of attempts is exceeded or if the operation is aborted.
 */
export async function retry<T>(_fn: () => T, _maxAttempts: number, _cbErr?: () => unknown, _abs?: AbortSignal): Promise<T> {
  while (--_maxAttempts >= 0 && !(_abs?.aborted ?? false))
    try {
      return await _fn()
    } catch (err: unknown) {
      if (_maxAttempts === 0)
        throw err
      await _cbErr?.()
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
 * @param _abs - An optional AbortSignal to abort the sleep.
 * @returns A Promise that resolves after the specified duration or rejects if aborted.
 */
export async function sleep(_ms: number, _abs?: AbortSignal): Promise<void> {
  if (_abs?.aborted)
    return Promise.reject(new Error("Sleep aborted before start"))
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      _abs?.removeEventListener("abort", onAbort)
      resolve()
    }, _ms)

    function onAbort() {
      clearTimeout(timeout)
      _abs?.removeEventListener("abort", onAbort)
      reject(new Error("Sleep aborted during wait"))
    }
    _abs?.addEventListener("abort", onAbort, { once: true })
  })
}



/**
 * Helper type to build a tuple of a specified length.
 *
 * @template N - The desired length of the tuple.
 * @template T - The tuple being built (used for recursion).
 */
type BuildTuple<N extends number, T extends number[] = []> =
  T['length'] extends N ? T : BuildTuple<N, [...T, T['length']]>


/**
 * Helper type to add two number types together.
 *
 * @template A - The first number type.
 * @template B - The second number type.
 */
export type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length']


/**
 * Helper type to enumerate numbers from 0 to N-1.
 *
 * @template N - The upper limit (exclusive) for the enumeration.
 * @template A - The accumulator array used for recursion.
 */
export type Enumerate<N extends number, A extends number[] = []> =
A['length'] extends N ? A[number] : Enumerate<N, [...A, A['length']]>



/**
 * A benchmarking class that provides various time units for measuring elapsed time.
 *
 * The class starts a timer upon instantiation and provides properties to access the elapsed time in different units (milliseconds, seconds, minutes, etc.).
 * The `round` method can be called to record the current elapsed time and restart the timer.
 *
 * @property {@link rounds} - An array that stores the recorded elapsed times from each round.
 * @property {@link timer} - The initial timestamp when the benchmark was created or last reset.
 * @method {@link round} - Records the current elapsed time and restarts the timer.
 * @method {@link reset} - Resets the benchmark timer to the current time and clears recorded rounds.
 * @accessor {@link y} - Elapsed time in years (assuming 365.25 days per year).
 * @accessor {@link mn} - Elapsed time in months (assuming 30.44 days per month).
 * @accessor {@link w} - Elapsed time in weeks.
 * @accessor {@link d} - Elapsed time in days.
 * @accessor {@link h} - Elapsed time in hours.
 * @accessor {@link m} - Elapsed time in minutes.
 * @accessor {@link s} - Elapsed time in seconds.
 * @accessor {@link ms} - Elapsed time in milliseconds.
 * @accessor {@link μs} - Elapsed time in microseconds.
 * @accessor {@link ns} - Elapsed time in nanoseconds.
 * @accessor {@link ps} - Elapsed time in picoseconds.
 */
export class Benchmark {
  /** An array that stores the recorded elapsed times from each round. */
  rounds: number[] = []
  /** Initializes the benchmark timer to the current time using `performance.now()`. */
  timer = performance.now()
  /** Records the current elapsed time and restarts the timer. */
  round() { this.rounds.push(this.ms); this.timer = performance.now() }
  /** Resets the benchmark timer to the current time and clears recorded rounds. */
  reset() { this.rounds = []; this.timer = performance.now() }
  /** Elapsed time in years (assuming 365.25 days per year). */
  get y() { return this.mn / 12 }
  /** Elapsed time in months (assuming 30.44 days per month). */
  get mn() { return this.w / 4 }
  /** Elapsed time in weeks. */
  get w() { return this.d / 7 }
  /** Elapsed time in days. */
  get d() { return this.h / 24 }
  /** Elapsed time in hours. */
  get h() { return this.m / 60 }
  /** Elapsed time in minutes. */
  get m() { return this.s / 60 }
  /** Elapsed time in seconds. */
  get s() { return this.ms / 1000 }
  /** Elapsed time in milliseconds. */
  get ms() { return performance.now() - this.timer }
  /** Elapsed time in microseconds. */
  get μs() { return this.ms * 1e3 }
  /** Elapsed time in nanoseconds. */
  get ns() { return this.μs * 1e3 }
  /** Elapsed time in picoseconds. */
  get ps() { return this.ns * 1e3 }
}



/**
 * Generates a random integer within a specified range, inclusive of both endpoints.
 *
 * @param _min - The minimum value of the range (inclusive). Defaults to `-0x80000000` to the lowest 32-bit signed integer.
 * @param _max - The maximum value of the range (inclusive). Defaults to `0x7fffffff` to the highest 32-bit signed integer.
 * @returns A random integer between {@link _min} and {@link _max}, inclusive.
 * @throws If {@link _min} or {@link _max} are not safe integers, or if the range is too large (greater than 2^32).
 */
export function rand(_min: number = -0x80000000, _max: number = 0x7fffffff): number {
  if (!Number.isSafeInteger(_min) || !Number.isSafeInteger(_max))
    throw new Error("Arguments must be safe integers")
  if (_min > _max) [_min, _max] = [_max, _min]
  const span = _max - _min + 1
  if (span > 0x100000000)
    throw new Error("Range is too large; max supported span is 2^32")
  const maxUnbiased = Math.floor(0x100000000 / span) * span
  const arr = new Uint32Array(1)
  let x: number
  do {
    globalThis.crypto.getRandomValues(arr)
    x = arr[0]!
  } while (x >= maxUnbiased)
  return _min + (x % span)
}



/**
 * Helper type that represents a view of a Uint8Array, exposing only view methods and properties, along with a readonly index signature for accessing elements.
 */
export type Uint8ArrayView = Pick<Uint8Array,
  | "at"
  | "includes"
  | "indexOf"
  | "lastIndexOf"
  | "find"
  | "findIndex"
  | "findLast"
  | "findLastIndex"
  | "every"
  | "some"
  | "forEach"
  | "entries"
  | "keys"
  | "values"
  | typeof Symbol.iterator
  | "reduce"
  | "reduceRight"
  | "join"
  | "toLocaleString"
  | "toString"
  | "map"
  | "filter"
  | "slice"
  | "toReversed"
  | "toSorted"
  | "with"
  | "length"
  | "byteLength"
  | "byteOffset"
> & { readonly [n: number]: Enumerate<256> }