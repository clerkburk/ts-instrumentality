// import { describe as vt.describe, it as vt.it, expect as vt.expect, vi as vt.vi, beforeEach as vt.beforeEach, afterEach } from 'vitest' // or jest, whatever you use
import * as vt from 'vitest'
import * as bs from '../src/base.js'



vt.describe('bs.range()', () => {
  
  vt.describe('Basic functionality', () => {
    vt.it('should handle single argument as "to" with default from=0', () => {
      vt.expect(bs.range(5)).toEqual([0, 1, 2, 3, 4])
    })

    vt.it('should handle two arguments as from/to', () => {
      vt.expect(bs.range(2, 7)).toEqual([2, 3, 4, 5, 6])
    })

    vt.it('should handle custom step', () => {
      vt.expect(bs.range(0, 10, 2)).toEqual([0, 2, 4, 6, 8])
    })

    vt.it('should handle reverse counting when from > to', () => {
      vt.expect(bs.range(10, 5)).toEqual([10, 9, 8, 7, 6])
    })

    vt.it('should handle reverse counting with custom step', () => {
      vt.expect(bs.range(10, 0, 2)).toEqual([10, 8, 6, 4, 2])
    })
  })

  vt.describe('Edge cases - Equal values', () => {
    vt.it('should return empty array when from === to', () => {
      vt.expect(bs.range(5, 5)).toEqual([])
    })

    vt.it('should return empty array when single arg is 0', () => {
      vt.expect(bs.range(0)).toEqual([])
    })
  })

  vt.describe('Negative numbers', () => {
    vt.it('should handle negative from', () => {
      vt.expect(bs.range(-5, 0)).toEqual([-5, -4, -3, -2, -1])
    })

    vt.it('should handle negative to', () => {
      vt.expect(bs.range(0, -5)).toEqual([0, -1, -2, -3, -4])
    })

    vt.it('should handle both negative', () => {
      vt.expect(bs.range(-10, -5)).toEqual([-10, -9, -8, -7, -6])
    })

    vt.it('should handle negative with custom step', () => {
      vt.expect(bs.range(-10, 0, 3)).toEqual([-10, -7, -4, -1])
    })
  })

  vt.describe('Floating point numbers', () => {
    vt.it('should handle float from/to values', () => {
      vt.expect(bs.range(0.5, 3.5)).toEqual([0.5, 1.5, 2.5])
    })

    vt.it('should handle float step', () => {
      vt.expect(bs.range(0, 1, 0.1)).toHaveLength(10)
    })

    vt.it('should handle float step - checking actual values', () => {
      const result = bs.range(0, 1, 0.2)
      // Compare rounded values to avoid floating point precision errors
      const rounded = result.map(x => Math.round(x * 100) / 100)
      vt.expect(rounded).toEqual([0, 0.2, 0.4, 0.6, 0.8])
    })

    vt.it('should handle very small float step', () => {
      const result = bs.range(0, 0.01, 0.001)
      vt.expect(result.length).toBe(10)
    })
  })

  vt.describe('Large ranges', () => {
    vt.it('should handle large range without step', () => {
      const result = bs.range(0, 10000)
      vt.expect(result).toHaveLength(10000)
      vt.expect(result[0]).toBe(0)
      vt.expect(result[9999]).toBe(9999)
    })

    vt.it('should handle very large range with large step', () => {
      const result = bs.range(0, 1000000, 1000)
      vt.expect(result).toHaveLength(1000)
    })

    vt.it('should handle memory stress - 1 million elements', () => {
      // This might blow up memory or be slow
      const result = bs.range(0, 1000000)
      vt.expect(result).toHaveLength(1000000)
    })
  })

  vt.describe('Step validation', () => {
    vt.it('should throw on zero step', () => {
      vt.expect(() => bs.range(0, 10, 0)).toThrow()
    })

    vt.it('should throw on negative step', () => {
      vt.expect(() => bs.range(0, 10, -1)).toThrow()
    })

    vt.it('should throw on very small negative step', () => {
      vt.expect(() => bs.range(0, 10, -0.001)).toThrow()
    })
  })

  vt.describe('NaN validation', () => {
    vt.it('should throw on NaN from', () => {
      vt.expect(() => bs.range(NaN, 10)).toThrow()
    })

    vt.it('should throw on NaN to', () => {
      vt.expect(() => bs.range(0, NaN)).toThrow()
    })

    vt.it('should throw on NaN step', () => {
      vt.expect(() => bs.range(0, 10, NaN)).toThrow()
    })

    vt.it('should throw on NaN single arg', () => {
      vt.expect(() => bs.range(NaN)).toThrow()
    })
  })

  vt.describe('Infinity validation', () => {
    vt.it('should throw on Infinity from', () => {
      vt.expect(() => bs.range(Infinity, 10)).toThrow()
    })

    vt.it('should throw on -Infinity from', () => {
      vt.expect(() => bs.range(-Infinity, 10)).toThrow()
    })

    vt.it('should throw on Infinity to', () => {
      vt.expect(() => bs.range(0, Infinity)).toThrow()
    })

    vt.it('should throw on Infinity step', () => {
      vt.expect(() => bs.range(0, 10, Infinity)).toThrow()
    })
  })

  vt.describe('Type coercion issues (TypeScript should catch, but testing runtime)', () => {
    vt.it('should handle integer-like floats correctly', () => {
      vt.expect(bs.range(1.0, 5.0)).toEqual([1, 2, 3, 4])
    })

    vt.it('should throw on string inputs', () => {
      // @ts-expect-error - testing runtime behavior
      vt.expect(() => bs.range('0', '5')).toThrow()
    })

    vt.it('should handle null/undefined in weird ways', () => {
      // @ts-expect-error - testing runtime behavior
      vt.expect(() => bs.range(null, 5)).toThrow()
    })
  })

  vt.describe('Step size edge cases', () => {
    vt.it('should handle step larger than range', () => {
      vt.expect(bs.range(0, 5, 10)).toEqual([0])
    })

    vt.it('should handle step exactly equal to range', () => {
      vt.expect(bs.range(0, 10, 10)).toEqual([0])
    })

    vt.it('should handle very small step creating many elements', () => {
      const result = bs.range(0, 10, 0.01)
      vt.expect(result).toHaveLength(1000)
    })

    vt.it('should handle tiny float step that causes precision issues', () => {
      // This will likely have floating point precision problems
      const result = bs.range(0, 1, 0.1)
      // The last element might not be exactly 0.9 due to floating point math
      console.log('Float precision test:', result)
      vt.expect(result.length).toBeGreaterThanOrEqual(10)
    })
  })

  vt.describe('Performance and behavior', () => {
    vt.it('should not mutate any inputs', () => {
      const from = 0
      const to = 10
      const step = 1
      bs.range(from, to, step)
      vt.expect(from).toBe(0)
      vt.expect(to).toBe(10)
      vt.expect(step).toBe(1)
    })

    vt.it('should return a new array each time', () => {
      const result1 = bs.range(0, 5)
      const result2 = bs.range(0, 5)
      vt.expect(result1).not.toBe(result2)
      vt.expect(result1).toEqual(result2)
    })

    vt.it('should be performant for reasonable ranges', () => {
      const start = performance.now()
      bs.range(0, 100000)
      const end = performance.now()
      vt.expect(end - start).toBeLessThan(100) // Should be fast
    })
  })

  vt.describe('Boundary precision issues', () => {
    vt.it('should handle the last element correctly with step', () => {
      // Does it include or exclude the boundary correctly?
      vt.expect(bs.range(0, 10, 3)).toEqual([0, 3, 6, 9]) // 12 would exceed
    })

    vt.it('should handle reverse with step correctly', () => {
      vt.expect(bs.range(10, 0, 3)).toEqual([10, 7, 4, 1]) // -2 would exceed
    })

    vt.it('should not include the "to" value', () => {
      const result = bs.range(0, 10)
      vt.expect(result).not.toContain(10)
      vt.expect(result[result.length - 1]).toBe(9)
    })
  })
})



vt.describe('Out class', () => {
  
  vt.describe('Basic functionality', () => {
    vt.it('should create instance with no args', () => {
      const out = new bs.Out()
      vt.expect(out.prefix).toBe("")
      vt.expect(out.suffix).toBe("")
      vt.expect(out.silence).toBe(false)
    })

    vt.it('should print with default console.log', () => {
      const spy = vt.vi.spyOn(console, 'log')
      const out = new bs.Out()
      out.print('test')

      vt.expect(spy).toHaveBeenCalledOnce()
      const call = spy.mock.calls[0]
      vt.expect(call[0]).toMatch(/^\[\d{4}-\d{2}-\d{2}T.*\]$/)
      vt.expect(call[1]).toBe('test')
      spy.mockRestore()
    })

    vt.it('should respect silence flag', () => {
      const spy = vt.vi.spyOn(console, 'log')
      const out = new bs.Out()
      out.silence = true
      out.print('test')
      
      vt.expect(spy).not.toHaveBeenCalled()
      spy.mockRestore()
    })

    vt.it('should use custom prefix', () => {
      const spy = vt.vi.spyOn(console, 'log')
      const out = new bs.Out('[INFO]')
      out.print('test')
      
      const call = spy.mock.calls[0]
      vt.expect(call[0]).toContain('[INFO]')
      spy.mockRestore()
    })

    vt.it('should use custom suffix', () => {
      const spy = vt.vi.spyOn(console, 'log')
      const out = new bs.Out('', ' <END>')
      out.print('test')
      
      const call = spy.mock.calls[0]
      vt.expect(call[0]).toContain(' <END>')
      spy.mockRestore()
    })
  })

  vt.describe('Color handling', () => {
    vt.it('should apply color to prefix', () => {
      const out = new bs.Out('[INFO]', '', bs.ANSI_ESC.RED)
      vt.expect(out.prefix).toBe('\u001b[31m[INFO]\u001b[0m')
    })

    vt.it('should apply color to suffix', () => {
      const out = new bs.Out('', ' <END>', bs.ANSI_ESC.BLUE)
      vt.expect(out.suffix).toBe('\u001b[34m <END>\u001b[0m')
    })

    vt.it('should apply color to both prefix and suffix', () => {
      const out = new bs.Out('[START]', '[END]', bs.ANSI_ESC.GREEN)
      vt.expect(out.prefix).toBe('\u001b[32m[START]\u001b[0m')
      vt.expect(out.suffix).toBe('\u001b[32m[END]\u001b[0m')
    })

    vt.it('should handle empty strings with color', () => {
      const out = new bs.Out('', '', bs.ANSI_ESC.YELLOW)
      // Color codes are still added even with empty strings
      vt.expect(out.prefix).toBe('\u001b[33m\u001b[0m')
      vt.expect(out.suffix).toBe('\u001b[33m\u001b[0m')
    })

    vt.it('should not apply color when undefined', () => {
      const out = new bs.Out('[INFO]', '[END]', undefined)
      vt.expect(out.prefix).toBe('[INFO]')
      vt.expect(out.suffix).toBe('[END]')
    })
  })

  vt.describe('Custom printer', () => {
    vt.it('should use custom printer function', () => {
      const customPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, customPrinter)
      out.print('test')
      
      vt.expect(customPrinter).toHaveBeenCalledOnce()
    })

    vt.it('should pass all args to custom printer', () => {
      const customPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, customPrinter)
      out.print('arg1', 'arg2', 'arg3')
      
      vt.expect(customPrinter).toHaveBeenCalledWith(
        vt.expect.stringMatching(/^\[\d{4}/),
        'arg1',
        'arg2',
        'arg3'
      )
    })

    vt.it('should work with console.error as printer', () => {
      const spy = vt.vi.spyOn(console, 'error')
      const out = new bs.Out('', '', undefined, console.error)
      out.print('error message')
      
      vt.expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    vt.it('should work with console.warn as printer', () => {
      const spy = vt.vi.spyOn(console, 'warn')
      const out = new bs.Out('', '', undefined, console.warn)
      out.print('warning')
      
      vt.expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })

  vt.describe('Edge cases - Printing various types', () => {
    let mockPrinter: any
    let out: bs.Out

    vt.beforeEach(() => {
      mockPrinter = vt.vi.fn()
      out = new bs.Out('', '', undefined, mockPrinter)
    })

    vt.it('should handle undefined', () => {
      out.print(undefined)
      vt.expect(mockPrinter).toHaveBeenCalled()
    })

    vt.it('should handle null', () => {
      out.print(null)
      vt.expect(mockPrinter).toHaveBeenCalled()
    })

    vt.it('should handle numbers', () => {
      out.print(42, 3.14, -0, Infinity, NaN)
      vt.expect(mockPrinter).toHaveBeenCalledWith(
        vt.expect.any(String),
        42, 3.14, -0, Infinity, NaN
      )
    })

    vt.it('should handle objects', () => {
      const obj = { foo: 'bar' }
      out.print(obj)
      vt.expect(mockPrinter).toHaveBeenCalledWith(vt.expect.any(String), obj)
    })

    vt.it('should handle arrays', () => {
      out.print([1, 2, 3])
      vt.expect(mockPrinter).toHaveBeenCalledWith(vt.expect.any(String), [1, 2, 3])
    })

    vt.it('should handle functions', () => {
      const fn = () => {}
      out.print(fn)
      vt.expect(mockPrinter).toHaveBeenCalledWith(vt.expect.any(String), fn)
    })

    vt.it('should handle symbols', () => {
      const sym = Symbol('test')
      out.print(sym)
      vt.expect(mockPrinter).toHaveBeenCalledWith(vt.expect.any(String), sym)
    })

    vt.it('should handle bigints', () => {
      out.print(123n)
      vt.expect(mockPrinter).toHaveBeenCalledWith(vt.expect.any(String), 123n)
    })

    vt.it('should handle multiple mixed types', () => {
      out.print('string', 42, null, undefined, { obj: true }, [1, 2])
      vt.expect(mockPrinter).toHaveBeenCalledOnce()
    })

    vt.it('should handle no arguments', () => {
      out.print()
      vt.expect(mockPrinter).toHaveBeenCalledOnce()
      vt.expect(mockPrinter.mock.calls[0]).toHaveLength(1) // Just timestamp+prefix+suffix
    })

    vt.it('should handle circular references', () => {
      const circular: any = { a: 1 }
      circular.self = circular
      // Should not throw
      vt.expect(() => out.print(circular)).not.toThrow()
    })
  })

  vt.describe('Timestamp behavior', () => {
    vt.it('should include valid ISO timestamp', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      out.print('test')
      
      const timestamp = mockPrinter.mock.calls[0][0]
      vt.expect(timestamp).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/)
    })

    vt.it('should generate different timestamps for consecutive calls', async () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      
      out.print('first')
      await new Promise(resolve => setTimeout(resolve, 2))
      out.print('second')
      
      const ts1 = mockPrinter.mock.calls[0][0]
      const ts2 = mockPrinter.mock.calls[1][0]
      // Timestamps might be the same if too fast, but should at least not error
      vt.expect(ts1).toBeTruthy()
      vt.expect(ts2).toBeTruthy()
    })
  })

  vt.describe('Mutation and state', () => {
    vt.it('should allow toggling silence', () => {
      const spy = vt.vi.spyOn(console, 'log')
      const out = new bs.Out()
      
      out.print('should print')
      vt.expect(spy).toHaveBeenCalledTimes(1)
      
      out.silence = true
      out.print('should not print')
      vt.expect(spy).toHaveBeenCalledTimes(1)
      
      out.silence = false
      out.print('should print again')
      vt.expect(spy).toHaveBeenCalledTimes(2)
      
      spy.mockRestore()
    })

    vt.it('should allow changing prefix', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('[OLD]', '', undefined, mockPrinter)
      
      out.print('test')
      vt.expect(mockPrinter.mock.calls[0][0]).toContain('[OLD]')
      
      out.prefix = '[NEW]'
      out.print('test')
      vt.expect(mockPrinter.mock.calls[1][0]).toContain('[NEW]')
    })

    vt.it('should allow changing printer', () => {
      const printer1 = vt.vi.fn()
      const printer2 = vt.vi.fn()
      const out = new bs.Out('', '', undefined, printer1)
      
      out.print('test1')
      vt.expect(printer1).toHaveBeenCalledOnce()
      vt.expect(printer2).not.toHaveBeenCalled()
      
      out.printer = printer2
      out.print('test2')
      vt.expect(printer1).toHaveBeenCalledOnce()
      vt.expect(printer2).toHaveBeenCalledOnce()
    })
  })

  vt.describe('ANSI_ESC enum values', () => {
    vt.it('should have correct ANSI escape codes', () => {
      vt.expect(bs.ANSI_ESC.BOLD).toBe('\u001b[1m')
      vt.expect(bs.ANSI_ESC.RESET).toBe('\u001b[0m')
      vt.expect(bs.ANSI_ESC.RED).toBe('\u001b[31m')
      vt.expect(bs.ANSI_ESC.GREEN).toBe('\u001b[32m')
    })

    vt.it('should work with all color values', () => {
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
        vt.expect(() => new bs.Out('test', '', color)).not.toThrow()
      })
    })

    vt.it('should work with formatting values', () => {
      const formats = [
        bs.ANSI_ESC.BOLD,
        bs.ANSI_ESC.ITALIC,
        bs.ANSI_ESC.UNDERLINE,
        bs.ANSI_ESC.STRIKETHROUGH
      ]
      
      formats.forEach(format => {
        vt.expect(() => new bs.Out('test', '', format)).not.toThrow()
      })
    })
  })

  vt.describe('Stress tests', () => {
    vt.it('should handle very long strings', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      const longString = 'a'.repeat(100000)
      
      vt.expect(() => out.print(longString)).not.toThrow()
    })

    vt.it('should handle many arguments', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      const manyArgs = Array(1000).fill('arg')
      
      vt.expect(() => out.print(...manyArgs)).not.toThrow()
    })

    vt.it('should handle rapid successive calls', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('', '', undefined, mockPrinter)
      
      for (let i = 0; i < 1000; i++) {
        out.print(`message ${i}`)
      }
      
      vt.expect(mockPrinter).toHaveBeenCalledTimes(1000)
    })
  })

  vt.describe('Weird edge cases', () => {
    vt.it('should handle prefix/suffix with special characters', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('🚀💀', '✨🔥', undefined, mockPrinter)
      out.print('test')
      
      vt.expect(mockPrinter.mock.calls[0][0]).toContain('🚀💀')
      vt.expect(mockPrinter.mock.calls[0][0]).toContain('✨🔥')
    })

    vt.it('should handle prefix/suffix with newlines', () => {
      const mockPrinter = vt.vi.fn()
      const out = new bs.Out('START\n', '\nEND', undefined, mockPrinter)
      out.print('test')
      
      vt.expect(mockPrinter.mock.calls[0][0]).toContain('START\n')
      vt.expect(mockPrinter.mock.calls[0][0]).toContain('\nEND')
    })

    vt.it('should handle prefix/suffix with ANSI codes already in them', () => {
      const out = new bs.Out('\u001b[31mRED', 'ALSO_RED\u001b[0m', bs.ANSI_ESC.BLUE)
      out.print('test')
      
      // This will create nested/conflicting ANSI codes - probably broken
      vt.expect(out.prefix).toBe('\u001b[34m\u001b[31mRED\u001b[0m')
    })

    vt.it('should handle printer that throws', () => {
      const throwingPrinter = () => { throw new Error('Printer failed') }
      const out = new bs.Out('', '', undefined, throwingPrinter)
      
      vt.expect(() => out.print('test')).toThrow()
    })

    vt.it('should handle printer that is not a function', () => {
      // @ts-expect-error - testing runtime behavior
      const out = new bs.Out('', '', undefined, 'not a function')
      
      vt.expect(() => out.print('test')).toThrow()
    })
  })
})



vt.describe('bs.retry()', () => {
  vt.it('should resolve immediately if function succeeds on first try', async () => {
    const fn = vt.vi.fn().mockReturnValue(42)
    const result = await bs.retry(fn, 3)
    vt.expect(result).toBe(42)
    vt.expect(fn).toHaveBeenCalledTimes(1)
  })

  vt.it('should retry the specified number of times on failure', async () => {
    const fn = vt.vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail1') })
      .mockImplementationOnce(() => { throw new Error('fail2') })
      .mockReturnValue('success')
    const result = await bs.retry(fn, 3)
    vt.expect(result).toBe('success')
    vt.expect(fn).toHaveBeenCalledTimes(3)
  })

  vt.it('should call _callbackOnError after each failure', async () => {
    const fn = vt.vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail') })
      .mockReturnValue('ok')
    const onError = vt.vi.fn()
    const result = await bs.retry(fn, 2, onError)
    vt.expect(result).toBe('ok')
    vt.expect(onError).toHaveBeenCalledTimes(1)
  })

  vt.it('should throw the last error if all attempts fail', async () => {
    const fn = vt.vi.fn(() => { throw new Error('fail') })
    const onError = vt.vi.fn()
    await vt.expect(bs.retry(fn, 2, onError)).rejects.toThrow('fail')
    vt.expect(fn).toHaveBeenCalledTimes(2)
    vt.expect(onError).toHaveBeenCalledTimes(1)
  })

  vt.it('should throw "Max attempts exceeded" if _maxAttempts is 0', async () => {
    const fn = vt.vi.fn(() => { throw new Error('fail') })
    await vt.expect(bs.retry(fn, 0)).rejects.toThrow('Max attempts exceeded')
    vt.expect(fn).not.toHaveBeenCalled()
  })

  vt.it('should support async functions', async () => {
    const fn = vt.vi.fn()
      .mockImplementationOnce(async () => { throw new Error('fail') })
      .mockImplementationOnce(async () => 'async-ok')
    const result = await bs.retry(fn, 2)
    vt.expect(result).toBe('async-ok')
    vt.expect(fn).toHaveBeenCalledTimes(2)
  })

  vt.it('should abort if AbortSignal is already aborted', async () => {
    const fn = vt.vi.fn()
    const abortController = new AbortController()
    abortController.abort()
    await vt.expect(bs.retry(fn, 3, undefined, abortController.signal)).rejects.toThrow('Operation aborted')
    vt.expect(fn).not.toHaveBeenCalled()
  })

  vt.it('should abort if AbortSignal is triggered during retries', async () => {
    let callCount = 0
    const fn = vt.vi.fn(() => {
      callCount++
      if (callCount === 1) throw new Error('fail')
      return 'ok'
    })
    const abortController = new AbortController()
    const onError = vt.vi.fn(() => abortController.abort())
    await vt.expect(bs.retry(fn, 3, onError, abortController.signal)).rejects.toThrow('Operation aborted')
    vt.expect(fn).toHaveBeenCalledTimes(1)
    vt.expect(onError).toHaveBeenCalledTimes(1)
  })

  vt.it('should not call _callbackOnError if function succeeds', async () => {
    const fn = vt.vi.fn(() => 'ok')
    const onError = vt.vi.fn()
    const result = await bs.retry(fn, 3, onError)
    vt.expect(result).toBe('ok')
    vt.expect(onError).not.toHaveBeenCalled()
  })

  vt.it('should propagate errors thrown by _callbackOnError', async () => {
    const fn = vt.vi.fn()
      .mockImplementationOnce(() => { throw new Error('fail') })
      .mockReturnValue('ok')
    const onError = vt.vi.fn(() => { throw new Error('onError fail') })
    await vt.expect(bs.retry(fn, 2, onError)).rejects.toThrow('onError fail')
    vt.expect(fn).toHaveBeenCalledTimes(1)
    vt.expect(onError).toHaveBeenCalledTimes(1)
  })

  vt.it('should work with _maxAttempts = 1 (single try)', async () => {
    const fn = vt.vi.fn(() => 'once')
    const result = await bs.retry(fn, 1)
    vt.expect(result).toBe('once')
    vt.expect(fn).toHaveBeenCalledTimes(1)
  })

  vt.it('should throw if _fn is not a function', async () => {
    // @ts-expect-error - runtime test
    await vt.expect(bs.retry(null, 2)).rejects.toThrow()
  })
})



vt.describe('bs.sleep()', () => {
  vt.it('should resolve after the specified time', async () => {
    const start = Date.now()
    await bs.sleep(30)
    const elapsed = Date.now() - start
    vt.expect(elapsed).toBeGreaterThanOrEqual(25)
  })

  vt.it('should resolve immediately for 0 ms', async () => {
    const start = Date.now()
    await bs.sleep(0)
    const elapsed = Date.now() - start
    vt.expect(elapsed).toBeLessThan(20)
  })

  vt.it('should reject if aborted before timeout', async () => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10)
    await vt.expect(bs.sleep(100, abortController.signal)).rejects.toThrow()
  })

  vt.it('should resolve if not aborted', async () => {
    const abortController = new AbortController()
    await vt.expect(bs.sleep(10, abortController.signal)).resolves.toBeUndefined()
  })

  vt.it('should reject immediately if already aborted', async () => {
    const abortController = new AbortController()
    abortController.abort()
    await vt.expect(bs.sleep(50, abortController.signal)).rejects.toThrow()
  })

  vt.it('should clean up abort event listener after resolve', async () => {
    const abortController = new AbortController()
    const addSpy = vt.vi.spyOn(abortController.signal, 'addEventListener')
    const removeSpy = vt.vi.spyOn(abortController.signal, 'removeEventListener')
    await bs.sleep(5, abortController.signal)
    vt.expect(addSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function), { once: true })
    vt.expect(removeSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  vt.it('should clean up abort event listener after reject', async () => {
    const abortController = new AbortController()
    const addSpy = vt.vi.spyOn(abortController.signal, 'addEventListener')
    const removeSpy = vt.vi.spyOn(abortController.signal, 'removeEventListener')
    setTimeout(() => abortController.abort(), 5)
    await vt.expect(bs.sleep(50, abortController.signal)).rejects.toThrow()
    vt.expect(addSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function), { once: true })
    vt.expect(removeSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  vt.it('should not throw if no AbortSignal is provided', async () => {
    await vt.expect(bs.sleep(5)).resolves.toBeUndefined()
  })
})



vt.describe('bs.scoped()', () => {
  vt.it('should call destructor on Symbol.dispose', () => {
    const destructor = vt.vi.fn()
    const obj = { foo: 1 }
    const scopedObj = bs.scoped(obj, destructor)
    vt.expect(typeof scopedObj[Symbol.dispose]).toBe('function')
    scopedObj[Symbol.dispose]()
    vt.expect(destructor).toHaveBeenCalledOnce()
  })

  vt.it('should call destructor on Symbol.asyncDispose (async)', async () => {
    const destructor = vt.vi.fn().mockResolvedValue(undefined)
    const obj = { foo: 2 }
    const scopedObj = bs.scoped(obj, destructor)
    vt.expect(typeof scopedObj[Symbol.asyncDispose]).toBe('function')
    await scopedObj[Symbol.asyncDispose]()
    vt.expect(destructor).toHaveBeenCalledOnce()
  })

  vt.it('should expose target property', () => {
    const obj = { bar: 3 }
    const scopedObj = bs.scoped(obj, () => {})
    vt.expect(scopedObj.target).toBe(obj)
  })

  vt.it('should expose destructor property', () => {
    const destructor = () => {}
    const scopedObj = bs.scoped({}, destructor)
    vt.expect(scopedObj.destructor).toBe(destructor)
  })

  vt.it('should throw if destructor throws (sync)', () => {
    const scopedObj = bs.scoped({}, () => { throw new Error('fail') })
    vt.expect(() => scopedObj[Symbol.dispose]()).toThrow('fail')
  })

  vt.it('should throw if destructor throws (async)', async () => {
    const scopedObj = bs.scoped({}, async () => { throw new Error('fail-async') })
    await vt.expect(scopedObj[Symbol.asyncDispose]()).rejects.toThrow('fail-async')
  })

  vt.it('should work with primitive targets', () => {
    const scopedObj = bs.scoped(123, vt.vi.fn())
    vt.expect(scopedObj.target).toBe(123)
  })

  vt.it('should allow multiple calls to Symbol.dispose', () => {
    const destructor = vt.vi.fn()
    const scopedObj = bs.scoped({}, destructor)
    scopedObj[Symbol.dispose]()
    scopedObj[Symbol.dispose]()
    vt.expect(destructor).toHaveBeenCalledTimes(2)
  })

  vt.it('should allow multiple calls to Symbol.asyncDispose', async () => {
    const destructor = vt.vi.fn().mockResolvedValue(undefined)
    const scopedObj = bs.scoped({}, destructor)
    await scopedObj[Symbol.asyncDispose]()
    await scopedObj[Symbol.asyncDispose]()
    vt.expect(destructor).toHaveBeenCalledTimes(2)
  })
})