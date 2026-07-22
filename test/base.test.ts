// import { describe as vt.describe, it as vt.it, expect as vt.expect, vi as vt.vi, beforeEach as vt.beforeEach, afterEach } from 'vitest' // or jest, whatever you use
import * as vt from 'vitest'
import * as bs from '../src/base'



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



vt.describe('bs.sleep()', () => {
  vt.it('resolves after the specified time', async () => {
    const start = Date.now()
    await bs.sleep(20)
    vt.expect(Date.now() - start).toBeGreaterThanOrEqual(15)
  })

  vt.it('resolves immediately for 0 ms', async () => {
    const start = Date.now()
    await bs.sleep(0)
    vt.expect(Date.now() - start).toBeLessThan(20)
  })

  vt.it('rejects if aborted before timeout', async () => {
    const abortController = new AbortController()
    setTimeout(() => abortController.abort(), 10)
    await vt.expect(bs.sleep(50, abortController.signal)).rejects.toThrow('Sleep aborted during wait')
  })

  vt.it('resolves if not aborted', async () => {
    const abortController = new AbortController()
    await vt.expect(bs.sleep(10, abortController.signal)).resolves.toBeUndefined()
  })

  vt.it('rejects immediately if already aborted', async () => {
    const abortController = new AbortController()
    abortController.abort()
    await vt.expect(bs.sleep(10, abortController.signal)).rejects.toThrow('Sleep aborted before start')
  })

  vt.it('cleans up abort event listener after resolve', async () => {
    const abortController = new AbortController()
    const addSpy = vt.vi.spyOn(abortController.signal, 'addEventListener')
    const removeSpy = vt.vi.spyOn(abortController.signal, 'removeEventListener')
    await bs.sleep(5, abortController.signal)
    vt.expect(addSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function), { once: true })
    vt.expect(removeSpy).toHaveBeenCalledWith('abort', vt.expect.any(Function))
    addSpy.mockRestore()
    removeSpy.mockRestore()
  })

  vt.it('cleans up abort event listener after reject', async () => {
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

  vt.it('does not throw if no AbortSignal is provided', async () => {
    await vt.expect(bs.sleep(5)).resolves.toBeUndefined()
  })
})