/**
 * Returns a Promise that resolves when the DOM is fully loaded and ready.
 *
 * @returns A Promise that resolves when the DOM is ready.
 */
export function onceReady(): Promise<void> {
  if (document.readyState === "complete" || document.readyState === "interactive")
    return Promise.resolve()
  return new Promise((resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true }))
}



/**
 * Retrieves an HTML element by its ID and ensures it matches the specified type.
 *
 * @param _id - The ID of the HTML element to retrieve.
 * @param _elementType - An optional constructor function for the expected element type.
 * @returns The HTML element with the specified ID and type.
 * @throws Will throw an error if the element is not found or does not match the expected type.
 */
export function byId<T extends HTMLElement>(_id: string, _elementType?: new () => T): T {
  const element = document.getElementById(_id)
  const typeCtor = _elementType ?? HTMLElement
  if (!(element instanceof typeCtor))
    throw new Error(`Type missmatch: Element with id '${_id}' is not of type ${typeCtor.name}`)
  return element as T
}



/**
 * Retrieves all HTML elements with the specified class name and ensures they match the specified type.
 *
 * @param _className - The class name of the HTML elements to retrieve.
 * @param _elementType - An optional constructor function for the expected element type.
 * @returns An array of HTML elements with the specified class name and type.
 * @throws Will throw an error if any element does not match the expected type.
 */
export function byClass<T extends HTMLElement>(_className: string, _elementType?: new () => T): T[] {
  return Array.from(document.getElementsByClassName(_className)).map((element, index) => {
    const typeCtor = _elementType ?? HTMLElement
    if (!(element instanceof typeCtor))
      throw new Error(`Type missmatch: Element at index ${index} with class '${_className}' is not of type ${typeCtor.name}`)
    return element as T
  })
}



/**
 * Retrieves all HTML elements with the specified tag name.
 *
 * @param _tagName - The tag name of the HTML elements to retrieve.
 */
export function byTag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][] {
  return Array.from(document.getElementsByTagName(_tagName))
}



declare global {
  interface Window {
    /**
     * Extends the global `Window` interface to include the `__instrumentality__` property.
     * 
     * @property __instrumentality__ - A record for storing arbitrary key-value pairs,
     *   typically used for attaching metadata to the window object (named after this library).
     */
    __instrumentality__: Record<string, unknown>
  }
}
window.__instrumentality__ = window.__instrumentality__ ?? {}
/**
 * A global store object attached to the `window` under the `__instrumentality__` property.
 * 
 * This store is intended to be used as a shared state or configuration object
 * accessible throughout the application. The exact structure and type of the store
 * depends on how `window.__instrumentality__` is defined elsewhere in the codebase.
 * 
 * @see window.__instrumentality__
 */
export const GLOBAL_STORE = window.__instrumentality__



export const COOKIE_PAIR_REGEX = /(?:^|; )([^=;]+)=([^;]*)/g
export const MAX_COOKIE_SIZE = 4096 as const // bytes
export const DEFAULT_PATH = '/' as const



export interface CookieData {
  value: string
  expires?: Date | number
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}



export function setCookie(_name: string, _data: CookieData, _path: string = DEFAULT_PATH): void {
  let cookieString = `${encodeURIComponent(_name)}=${encodeURIComponent(_data.value)}; Path=${_path}`
  if (_data.expires)
    if (_data.expires instanceof Date)
      cookieString += `; Expires=${_data.expires.toUTCString()}`
    else
      cookieString += `; Max-Age=${_data.expires}`
  if (_data.domain)
    cookieString += `; Domain=${_data.domain}`
  if (_data.secure)
    cookieString += `; Secure`
  if (_data.sameSite)
    cookieString += `; SameSite=${_data.sameSite}`
  document.cookie = cookieString
}
export function findCookie(_name: string): string | null {
  const matches = document.cookie.matchAll(COOKIE_PAIR_REGEX)
  for (const match of matches)
    if (decodeURIComponent(match[1] ?? "") === _name)
      return decodeURIComponent(match[2] ?? "")
  return null
}
export function deleteCookie(_name: string, _path: string = DEFAULT_PATH): void {
  setCookie(_name, { value: "", expires: new Date(0) }, _path)
}
export function listCookies(): Record<string, string> {
  const cookies: Record<string, string> = {}
  const matches = document.cookie.matchAll(COOKIE_PAIR_REGEX)
  for (const match of matches) {
    const name = decodeURIComponent(match[1] ?? "")
    const value = decodeURIComponent(match[2] ?? "")
    cookies[name] = value
  }
  return cookies
}