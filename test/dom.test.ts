import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as dm from '../src/dom'



describe('dm.once_ready', () => {
  let originalReadyState: string
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let originalAddEventListener: typeof document.addEventListener

  beforeEach(() => {
    // Save original readyState and addEventListener
    originalReadyState = document.readyState
    originalAddEventListener = document.addEventListener
  })

  afterEach(() => {
    // Restore original readyState and addEventListener
    Object.defineProperty(document, 'readyState', {
      value: originalReadyState,
      configurable: true,
    })
    document.addEventListener = originalAddEventListener
    vi.restoreAllMocks()
  })

  it('resolves immediately if document.readyState is "complete"', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      configurable: true,
    })
    await expect(dm.once_ready()).resolves.toBeUndefined()
  })

  it('resolves immediately if document.readyState is "interactive"', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'interactive',
      configurable: true,
    })
    await expect(dm.once_ready()).resolves.toBeUndefined()
  })

  it('waits for DOMContentLoaded if document.readyState is "loading"', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      configurable: true,
    })

    let domContentLoadedCallback: (() => void) | undefined

    addEventListenerSpy = vi.spyOn(document, 'addEventListener').mockImplementation(
      (event, cb: any, options) => {
        if (event === 'DOMContentLoaded') {
          domContentLoadedCallback = cb
        }
        // @ts-ignore
        return originalAddEventListener.call(document, event, cb, options)
      }
    )

    const promise = dm.once_ready()
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'DOMContentLoaded',
      expect.any(Function),
      { once: true }
    )

    // Simulate DOMContentLoaded event
    domContentLoadedCallback && domContentLoadedCallback()
    await expect(promise).resolves.toBeUndefined()
  })
})