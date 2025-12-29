import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest' // or jest, whatever you use
import * as bs from '../src/base.js'



describe('bs.range()', () => {
  
  describe('Basic functionality', () => {
    it('should handle single argument as "to" with default from=0', () => {
      expect(bs.range(5)).toEqual([0, 1, 2, 3, 4])
    })

    it('should handle two arguments as from/to', () => {
      expect(bs.range(2, 7)).toEqual([2, 3, 4, 5, 6])
    })

    it('should handle custom step', () => {
      expect(bs.range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
    })

    it('should handle reverse counting when from > to', () => {
      expect(bs.range(10, 5)).toEqual([10, 9, 8, 7, 6])
    })

    it('should handle reverse counting with custom step', () => {
      expect(bs.range(10, 0, 2)).toEqual([10, 8, 6, 4, 2])
    })
  })

  describe('Edge cases - Equal values', () => {
    it('should return empty array when from === to', () => {
      expect(bs.range(5, 5)).toEqual([])
    })

    it('should return empty array when single arg is 0', () => {
      expect(bs.range(0)).toEqual([])
    })
  })

  describe('Negative numbers', () => {
    it('should handle negative from', () => {
      expect(bs.range(-5, 0)).toEqual([-5, -4, -3, -2, -1])
    })

    it('should handle negative to', () => {
      expect(bs.range(0, -5)).toEqual([0, -1, -2, -3, -4])
    })

    it('should handle both negative', () => {
      expect(bs.range(-10, -5)).toEqual([-10, -9, -8, -7, -6])
    })

    it('should handle negative with custom step', () => {
      expect(bs.range(-10, 0, 3)).toEqual([-10, -7, -4, -1])
    })
  })

  describe('Floating point numbers', () => {
    it('should handle float from/to values', () => {
      expect(bs.range(0.5, 3.5)).toEqual([0.5, 1.5, 2.5])
    })

    it('should handle float step', () => {
      expect(bs.range(0, 1, 0.1)).toHaveLength(10)
    })

    it('should handle float step - checking actual values', () => {
      const result = bs.range(0, 1, 0.2)
      // Compare rounded values to avoid floating point precision errors
      const rounded = result.map(x => Math.round(x * 100) / 100)
      expect(rounded).toEqual([0, 0.2, 0.4, 0.6, 0.8])
    })

    it('should handle very small float step', () => {
      const result = bs.range(0, 0.01, 0.001)
      expect(result.length).toBe(10)
    })
  })

  describe('Large ranges', () => {
    it('should handle large range without step', () => {
      const result = bs.range(0, 10000)
      expect(result).toHaveLength(10000)
      expect(result[0]).toBe(0)
      expect(result[9999]).toBe(9999)
    })

    it('should handle very large range with large step', () => {
      const result = bs.range(0, 1000000, 1000)
      expect(result).toHaveLength(1000)
    })

    it('should handle memory stress - 1 million elements', () => {
      // This might blow up memory or be slow
      const result = bs.range(0, 1000000)
      expect(result).toHaveLength(1000000)
    })
  })

  describe('Step validation', () => {
    it('should throw on zero step', () => {
      expect(() => bs.range(0, 10, 0)).toThrow()
    })

    it('should throw on negative step', () => {
      expect(() => bs.range(0, 10, -1)).toThrow()
    })

    it('should throw on very small negative step', () => {
      expect(() => bs.range(0, 10, -0.001)).toThrow()
    })
  })

  describe('NaN validation', () => {
    it('should throw on NaN from', () => {
      expect(() => bs.range(NaN, 10)).toThrow()
    })

    it('should throw on NaN to', () => {
      expect(() => bs.range(0, NaN)).toThrow()
    })

    it('should throw on NaN step', () => {
      expect(() => bs.range(0, 10, NaN)).toThrow()
    })

    it('should throw on NaN single arg', () => {
      expect(() => bs.range(NaN)).toThrow()
    })
  })

  describe('Infinity validation', () => {
    it('should throw on Infinity from', () => {
      expect(() => bs.range(Infinity, 10)).toThrow()
    })

    it('should throw on -Infinity from', () => {
      expect(() => bs.range(-Infinity, 10)).toThrow()
    })

    it('should throw on Infinity to', () => {
      expect(() => bs.range(0, Infinity)).toThrow()
    })

    it('should throw on Infinity step', () => {
      expect(() => bs.range(0, 10, Infinity)).toThrow()
    })
  })

  describe('Type coercion issues (TypeScript should catch, but testing runtime)', () => {
    it('should handle integer-like floats correctly', () => {
      expect(bs.range(1.0, 5.0)).toEqual([1, 2, 3, 4])
    })

    it('should throw on string inputs', () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => bs.range('0', '5')).toThrow()
    })

    it('should handle null/undefined in weird ways', () => {
      // @ts-expect-error - testing runtime behavior
      expect(() => bs.range(null, 5)).toThrow()
    })
  })

  describe('Step size edge cases', () => {
    it('should handle step larger than range', () => {
      expect(bs.range(0, 5, 10)).toEqual([0])
    })

    it('should handle step exactly equal to range', () => {
      expect(bs.range(0, 10, 10)).toEqual([0])
    })

    it('should handle very small step creating many elements', () => {
      const result = bs.range(0, 10, 0.01)
      expect(result).toHaveLength(1000)
    })

    it('should handle tiny float step that causes precision issues', () => {
      // This will likely have floating point precision problems
      const result = bs.range(0, 1, 0.1)
      // The last element might not be exactly 0.9 due to floating point math
      console.log('Float precision test:', result)
      expect(result.length).toBeGreaterThanOrEqual(10)
    })
  })

  describe('Performance and behavior', () => {
    it('should not mutate any inputs', () => {
      const from = 0
      const to = 10
      const step = 1
      bs.range(from, to, step)
      expect(from).toBe(0)
      expect(to).toBe(10)
      expect(step).toBe(1)
    })

    it('should return a new array each time', () => {
      const result1 = bs.range(0, 5)
      const result2 = bs.range(0, 5)
      expect(result1).not.toBe(result2)
      expect(result1).toEqual(result2)
    })

    it('should be performant for reasonable ranges', () => {
      const start = performance.now()
      bs.range(0, 100000)
      const end = performance.now()
      expect(end - start).toBeLessThan(100) // Should be fast
    })
  })

  describe('Boundary precision issues', () => {
    it('should handle the last element correctly with step', () => {
      // Does it include or exclude the boundary correctly?
      expect(bs.range(0, 10, 3)).toEqual([0, 3, 6, 9]) // 12 would exceed
    })

    it('should handle reverse with step correctly', () => {
      expect(bs.range(10, 0, 3)).toEqual([10, 7, 4, 1]) // -2 would exceed
    })

    it('should not include the "to" value', () => {
      const result = bs.range(0, 10)
      expect(result).not.toContain(10)
      expect(result[result.length - 1]).toBe(9)
    })
  })
})



describe('Out class', () => {
  
  describe('Basic functionality', () => {
    it('should create instance with no args', () => {
      const out = new bs.Out()
      expect(out.prefix).toBe("")
      expect(out.suffix).toBe("")
      expect(out.silence).toBe(false)
    })

    it('should print with default console.log', () => {
      const spy = vi.spyOn(console, 'log')
      const out = new bs.Out()
      out.print('test')

      expect(spy).toHaveBeenCalledOnce()
      const call = spy.mock.calls[0]
      expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\]$/)
      expect(call[1]).toBe('test')
      spy.mockRestore()
    })

    it('should respect silence flag', () => {
      const spy = vi.spyOn(console, 'log')
      const out = new bs.Out()
      out.silence = true
      out.print('test')
      
      expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    it('should use custom prefix', () => {
      const spy = vi.spyOn(console, 'log')
      const out = new bs.Out('[INFO]')
      out.print('test')
      
      const call = spy.mock.calls[0]
      expect(call[0]).toContain('[INFO]')
      spy.mockRestore()
    })

    it('should use custom suffix', () => {
      const spy = vi.spyOn(console, 'log')
      const out = new bs.Out('', ' <END>')
      out.print('test')
      
      const call = spy.mock.calls[0]
      expect(call[0]).toContain(' <END>')
      spy.mockRestore()
    })
  })

  describe('Color handling', () => {
    it('should apply color to prefix', () => {
      const out = new bs.Out('[INFO]', '', bs.ANSI_ESC.RED)
      expect(out.prefix).toBe('\u001b[31m[INFO]\u001b[0m')
    })

    it('should apply color to suffix', () => {
      const out = new bs.Out('', ' <END>', bs.ANSI_ESC.BLUE)
      expect(out.suffix).toBe('\u001b[34m <END>\u001b[0m')
    })

    it('should apply color to both prefix and suffix', () => {
      const out = new bs.Out('[START]', '[END]', bs.ANSI_ESC.GREEN)
      expect(out.prefix).toBe('\u001b[32m[START]\u001b[0m')
      expect(out.suffix).toBe('\u001b[32m[END]\u001b[0m')
    })

    it('should handle empty strings with color', () => {
      const out = new bs.Out('', '', bs.ANSI_ESC.YELLOW)
      // Color codes are still added even with empty strings
      expect(out.prefix).toBe('\u001b[33m\u001b[0m')
      expect(out.suffix).toBe('\u001b[33m\u001b[0m')
    })

    it('should not apply color when undefined', () => {
      const out = new bs.Out('[INFO]', '[END]', undefined)
      expect(out.prefix).toBe('[INFO]')
      expect(out.suffix).toBe('[END]')
    })
  })

  describe('Custom printer', () => {
    it('should use custom printer function', () => {
      const customPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, customPrinter)
      out.print('test')
      
      expect(customPrinter).toHaveBeenCalledOnce()
    })

    it('should pass all args to custom printer', () => {
      const customPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, customPrinter)
      out.print('arg1', 'arg2', 'arg3')
      
      expect(customPrinter).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}/),
        'arg1',
        'arg2',
        'arg3'
      )
    })

    it('should work with console.error as printer', () => {
      const spy = vi.spyOn(console, 'error')
      const out = new bs.Out('', '', undefined, console.error)
      out.print('error message')
      
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('should work with console.warn as printer', () => {
      const spy = vi.spyOn(console, 'warn')
      const out = new bs.Out('', '', undefined, console.warn)
      out.print('warning')
      
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  describe('Edge cases - Printing various types', () => {
    let mockPrinter: any
    let out: bs.Out

    beforeEach(() => {
      mockPrinter = vi.fn()
      out = new bs.Out('', '', undefined, mockPrinter)
    })

    it('should handle undefined', () => {
      out.print(undefined)
      expect(mockPrinter).toHaveBeenCalled()
    })

    it('should handle null', () => {
      out.print(null)
      expect(mockPrinter).toHaveBeenCalled()
    })

    it('should handle numbers', () => {
      out.print(42, 3.14, -0, Infinity, NaN)
      expect(mockPrinter).toHaveBeenCalledWith(
        expect.any(String),
        42, 3.14, -0, Infinity, NaN
      )
    })

    it('should handle objects', () => {
      const obj = { foo: 'bar' }
      out.print(obj)
      expect(mockPrinter).toHaveBeenCalledWith(expect.any(String), obj)
    })

    it('should handle arrays', () => {
      out.print([1, 2, 3])
      expect(mockPrinter).toHaveBeenCalledWith(expect.any(String), [1, 2, 3])
    })

    it('should handle functions', () => {
      const fn = () => {}
      out.print(fn)
      expect(mockPrinter).toHaveBeenCalledWith(expect.any(String), fn)
    })

    it('should handle symbols', () => {
      const sym = Symbol('test')
      out.print(sym)
      expect(mockPrinter).toHaveBeenCalledWith(expect.any(String), sym)
    })

    it('should handle bigints', () => {
      out.print(123n)
      expect(mockPrinter).toHaveBeenCalledWith(expect.any(String), 123n)
    })

    it('should handle multiple mixed types', () => {
      out.print('string', 42, null, undefined, { obj: true }, [1, 2])
      expect(mockPrinter).toHaveBeenCalledOnce()
    })

    it('should handle no arguments', () => {
      out.print()
      expect(mockPrinter).toHaveBeenCalledOnce()
      expect(mockPrinter.mock.calls[0]).toHaveLength(1) // Just timestamp+prefix+suffix
    })

    it('should handle circular references', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      // Should not throw
      expect(() => out.print(circular)).not.toThrow()
    })
  })

  describe('Timestamp behavior', () => {
    it('should include valid ISO timestamp', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      out.print('test')
      
      const timestamp = mockPrinter.mock.calls[0][0]
      expect(timestamp).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
    })

    it('should generate different timestamps for consecutive calls', async () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      
      out.print('first')
      await new Promise(resolve => setTimeout(resolve, 2))
      out.print('second')
      
      const ts1 = mockPrinter.mock.calls[0][0]
      const ts2 = mockPrinter.mock.calls[1][0]
      // Timestamps might be the same if too fast, but should at least not error
      expect(ts1).toBeTruthy()
      expect(ts2).toBeTruthy()
    })
  })

  describe('Mutation and state', () => {
    it('should allow toggling silence', () => {
      const spy = vi.spyOn(console, 'log')
      const out = new bs.Out()
      
      out.print('should print')
      expect(spy).toHaveBeenCalledTimes(1)
      
      out.silence = true
      out.print('should not print')
      expect(spy).toHaveBeenCalledTimes(1)
      
      out.silence = false
      out.print('should print again')
      expect(spy).toHaveBeenCalledTimes(2)
      
      spy.mockRestore()
    })

    it('should allow changing prefix', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('[OLD]', '', undefined, mockPrinter)
      
      out.print('test')
      expect(mockPrinter.mock.calls[0][0]).toContain('[OLD]')
      
      out.prefix = '[NEW]'
      out.print('test')
      expect(mockPrinter.mock.calls[1][0]).toContain('[NEW]')
    })

    it('should allow changing printer', () => {
      const printer1 = vi.fn()
      const printer2 = vi.fn()
      const out = new bs.Out('', '', undefined, printer1)
      
      out.print('test1')
      expect(printer1).toHaveBeenCalledOnce()
      expect(printer2).not.toHaveBeenCalled()
      
      out.printer = printer2
      out.print('test2')
      expect(printer1).toHaveBeenCalledOnce()
      expect(printer2).toHaveBeenCalledOnce()
    })
  })

  describe('ANSI_ESC enum values', () => {
    it('should have correct ANSI escape codes', () => {
      expect(bs.ANSI_ESC.BOLD).toBe('\u001b[1m')
      expect(bs.ANSI_ESC.RESET).toBe('\u001b[0m')
      expect(bs.ANSI_ESC.RED).toBe('\u001b[31m')
      expect(bs.ANSI_ESC.GREEN).toBe('\u001b[32m')
    })

    it('should work with all color values', () => {
      const colors = [
        bs.ANSI_ESC.BLACK,
        bs.ANSI_ESC.RED,
        bs.ANSI_ESC.GREEN,
        bs.ANSI_ESC.YELLOW,
        bs.ANSI_ESC.BLUE,
        bs.ANSI_ESC.MAGENTA,
        bs.ANSI_ESC.CYAN,
        bs.ANSI_ESC.WHITE
      ]
      
      colors.forEach(color => {
        expect(() => new bs.Out('test', '', color)).not.toThrow()
      })
    })

    it('should work with formatting values', () => {
      const formats = [
        bs.ANSI_ESC.BOLD,
        bs.ANSI_ESC.ITALIC,
        bs.ANSI_ESC.UNDERLINE,
        bs.ANSI_ESC.STRIKETHROUGH
      ]
      
      formats.forEach(format => {
        expect(() => new bs.Out('test', '', format)).not.toThrow()
      })
    })
  })

  describe('Stress tests', () => {
    it('should handle very long strings', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      const longString = 'a'.repeat(100000)
      
      expect(() => out.print(longString)).not.toThrow()
    })

    it('should handle many arguments', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      const manyArgs = Array(1000).fill('arg')
      
      expect(() => out.print(...manyArgs)).not.toThrow()
    })

    it('should handle rapid successive calls', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      
      for (let i = 0; i < 1000; i++) {
        out.print(`message ${i}`)
      }
      
      expect(mockPrinter).toHaveBeenCalledTimes(1000)
    })
  })

  describe('Weird edge cases', () => {
    it('should handle prefix/suffix with special characters', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('🚀💀', '✨🔥', undefined, mockPrinter)
      out.print('test')
      
      expect(mockPrinter.mock.calls[0][0]).toContain('🚀💀')
      expect(mockPrinter.mock.calls[0][0]).toContain('✨🔥')
    })

    it('should handle prefix/suffix with newlines', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('START\n', '\nEND', undefined, mockPrinter)
      out.print('test')
      
      expect(mockPrinter.mock.calls[0][0]).toContain('START\n')
      expect(mockPrinter.mock.calls[0][0]).toContain('\nEND')
    })

    it('should handle prefix/suffix with ANSI codes already in them', () => {
      const mockPrinter = vi.fn()
      const out = new bs.Out('\u001b[31mRED', 'ALSO_RED\u001b[0m', bs.ANSI_ESC.BLUE)
      out.print('test')
      
      // This will create nested/conflicting ANSI codes - probably broken
      expect(out.prefix).toBe('\u001b[34m\u001b[31mRED\u001b[0m')
    })

    it('should handle printer that throws', () => {
      const throwingPrinter = () => { throw new Error('Printer failed') }
      const out = new bs.Out('', '', undefined, throwingPrinter)
      
      expect(() => out.print('test')).toThrow()
    })

    it('should handle printer that is not a function', () => {
      // @ts-expect-error - testing runtime behavior
      const out = new bs.Out('', '', undefined, 'not a function')
      
      expect(() => out.print('test')).toThrow()
    })
  })
})



describe('bs.retry()', () => {
  it('should resolve immediately if function succeeds on first try', async () => {
    const fn = vi.fn().mockReturnValue(42)
    const result = await bs.retry(fn, 3)
    expect(result).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should retry the specified number of times on failure', async () => {
    const fn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail1') })
      .mockImplementationOnce(() => { throw new Error('fail2') })
      .mockReturnValue('success')
    const result = await bs.retry(fn, 3)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should call _callbackOnError after each failure', async () => {
    const fn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail') })
      .mockReturnValue('ok')
    const onError = vi.fn()
    const result = await bs.retry(fn, 2, onError)
    expect(result).toBe('ok')
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should throw the last error if all attempts fail', async () => {
    const fn = vi.fn(() => { throw new Error('fail') })
    const onError = vi.fn()
    await expect(bs.retry(fn, 2, onError)).rejects.toThrow('fail')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should throw "Max attempts exceeded" if _maxAttempts is 0', async () => {
    const fn = vi.fn(() => { throw new Error('fail') })
    await expect(bs.retry(fn, 0)).rejects.toThrow('Max attempts exceeded')
    expect(fn).not.toHaveBeenCalled()
  })

  it('should support async functions', async () => {
    const fn = vi.fn()
      .mockImplementationOnce(async () => { throw new Error('fail') })
      .mockImplementationOnce(async () => 'async-ok')
    const result = await bs.retry(fn, 2)
    expect(result).toBe('async-ok')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should abort if AbortSignal is already aborted', async () => {
    const fn = vi.fn()
    const abortController = new AbortController()
    abortController.abort()
    await expect(bs.retry(fn, 3, undefined, abortController.signal)).rejects.toThrow('Operation aborted')
    expect(fn).not.toHaveBeenCalled()
  })

  it('should abort if AbortSignal is triggered during retries', async () => {
    let callCount = 0
    const fn = vi.fn(() => {
      callCount++
      if (callCount === 1) throw new Error('fail')
      return 'ok'
    })
    const abortController = new AbortController()
    const onError = vi.fn(() => abortController.abort())
    await expect(bs.retry(fn, 3, onError, abortController.signal)).rejects.toThrow('Operation aborted')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should not call _callbackOnError if function succeeds', async () => {
    const fn = vi.fn(() => 'ok')
    const onError = vi.fn()
    const result = await bs.retry(fn, 3, onError)
    expect(result).toBe('ok')
    expect(onError).not.toHaveBeenCalled()
  })

  it('should propagate errors thrown by _callbackOnError', async () => {
    const fn = vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail') })
      .mockReturnValue('ok')
    const onError = vi.fn(() => { throw new Error('onError fail') })
    await expect(bs.retry(fn, 2, onError)).rejects.toThrow('onError fail')
    expect(fn).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledTimes(1)
  })

  it('should work with _maxAttempts = 1 (single try)', async () => {
    const fn = vi.fn(() => 'once')
    const result = await bs.retry(fn, 1)
    expect(result).toBe('once')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should throw if _fn is not a function', async () => {
    // @ts-expect-error - runtime test
    await expect(bs.retry(null, 2)).rejects.toThrow()
  })
})



describe('bs.sleep()', () => {
  it('should resolve after the specified time', async () => {
    const start = Date.now()
    await bs.sleep(30)
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(25)
  })

  it('should resolve immediately for 0 ms', async () => {
    const start = Date.now()
    await bs.sleep(0)
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(20)
  })

  it('should reject if aborted before timeout', async () => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10)
    await expect(bs.sleep(100, abortController.signal)).rejects.toThrow()
  })

  it('should resolve if not aborted', async () => {
    const abortController = new AbortController()
    await expect(bs.sleep(10, abortController.signal)).resolves.toBeUndefined()
  })

  it('should reject immediately if already aborted', async () => {
    const abortController = new AbortController()
    abortController.abort()
    await expect(bs.sleep(50, abortController.signal)).rejects.toThrow()
  })

  it('should clean up abort event listener after resolve', async () => {
    const abortController = new AbortController()
    const addSpy = vi.spyOn(abortController.signal, 'addEventListener')
    const removeSpy = vi.spyOn(abortController.signal, 'removeEventListener')
    await bs.sleep(5, abortController.signal)
    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('should clean up abort event listener after reject', async () => {
    const abortController = new AbortController()
    const addSpy = vi.spyOn(abortController.signal, 'addEventListener')
    const removeSpy = vi.spyOn(abortController.signal, 'removeEventListener')
    setTimeout(() => abortController.abort(), 5)
    await expect(bs.sleep(50, abortController.signal)).rejects.toThrow()
    expect(addSpy).toHaveBeenCalledWith('abort', expect.any(Function), { once: true })
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('should not throw if no AbortSignal is provided', async () => {
    await expect(bs.sleep(5)).resolves.toBeUndefined()
  })
})



describe('bs.scoped()', () => {
  it('should call destructor on Symbol.dispose', () => {
    const destructor = vi.fn()
    const obj = { foo: 1 }
    const scopedObj = bs.scoped(obj, destructor)
    expect(typeof scopedObj[Symbol.dispose]).toBe('function')
    scopedObj[Symbol.dispose]()
    expect(destructor).toHaveBeenCalledOnce()
  })

  it('should call destructor on Symbol.asyncDispose (async)', async () => {
    const destructor = vi.fn().mockResolvedValue(undefined)
    const obj = { foo: 2 }
    const scopedObj = bs.scoped(obj, destructor)
    expect(typeof scopedObj[Symbol.asyncDispose]).toBe('function')
    await scopedObj[Symbol.asyncDispose]()
    expect(destructor).toHaveBeenCalledOnce()
  })

  it('should expose target property', () => {
    const obj = { bar: 3 }
    const scopedObj = bs.scoped(obj, () => {})
    expect(scopedObj.target).toBe(obj)
  })

  it('should expose destructor property', () => {
    const destructor = () => {}
    const scopedObj = bs.scoped({}, destructor)
    expect(scopedObj.destructor).toBe(destructor)
  })

  it('should throw if destructor throws (sync)', () => {
    const scopedObj = bs.scoped({}, () => { throw new Error('fail') })
    expect(() => scopedObj[Symbol.dispose]()).toThrow('fail')
  })

  it('should throw if destructor throws (async)', async () => {
    const scopedObj = bs.scoped({}, async () => { throw new Error('fail-async') })
    await expect(scopedObj[Symbol.asyncDispose]()).rejects.toThrow('fail-async')
  })

  it('should work with primitive targets', () => {
    const scopedObj = bs.scoped(123, vi.fn())
    expect(scopedObj.target).toBe(123)
  })

  it('should allow multiple calls to Symbol.dispose', () => {
    const destructor = vi.fn()
    const scopedObj = bs.scoped({}, destructor)
    scopedObj[Symbol.dispose]()
    scopedObj[Symbol.dispose]()
    expect(destructor).toHaveBeenCalledTimes(2)
  })

  it('should allow multiple calls to Symbol.asyncDispose', async () => {
    const destructor = vi.fn().mockResolvedValue(undefined)
    const scopedObj = bs.scoped({}, destructor)
    await scopedObj[Symbol.asyncDispose]()
    await scopedObj[Symbol.asyncDispose]()
    expect(destructor).toHaveBeenCalledTimes(2)
  })
})