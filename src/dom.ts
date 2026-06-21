/**
 * Returns a Promise that resolves when the DOM is fully loaded and ready.
 *
 * @returns A Promise that resolves when the DOM is ready.
 */
export async function onceReady(): Promise<void> {
  if (document.readyState === "complete" || document.readyState === "interactive")
    return Promise.resolve()
  return new Promise(r => document.addEventListener("DOMContentLoaded", () => r(), { once: true }))
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
 * @param _className - The class name of the elements to retrieve.
 * @param _elementType - An optional constructor function for the expected element type.
 * @returns An array of {@link HTMLElement} with the specified class name and type.
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
     * Extends the global {@link Window} interface to include the {@link __instrumentality__} property.
     * 
     * @property {@link __instrumentality__} - A record for storing arbitrary key-value pairs,
     * typically used for attaching metadata to the window object (named after this library).
     */
    __instrumentality__: Record<string, unknown>
  }
}
window.__instrumentality__ = window.__instrumentality__ ?? {}
/**
 * This store is intended to be used as a shared state or configuration object
 * accessible throughout the application. The exact structure and type of the store
 * depends on how {@link window.__instrumentality__} is defined elsewhere in the codebase.
 */
export const GLOBAL_STORE = window.__instrumentality__



export const COOKIE_PAIR_REGEX = /(?:^|; )([^=;]+)=([^;]*)/g
export const MAX_COOKIE_SIZE = 4096 as const // bytes
export const DEFAULT_PATH = '/' as const



export interface CookieData {
  value: unknown
  expires?: Date | number
  domain?: string
  secure?: boolean
  sameSite?: 'Strict' | 'Lax' | 'None'
}

export function setCookie(_name: string, _data: CookieData, _path: string = DEFAULT_PATH): void {
  let cookieString = `${encodeURIComponent(_name)}=${encodeURIComponent(JSON.stringify(_data.value))}; Path=${_path}`
  if (_data.expires)
    if (_data.expires instanceof Date) cookieString += `; Expires=${_data.expires.toUTCString()}`
    else cookieString += `; Max-Age=${_data.expires}`
  if (_data.domain) cookieString += `; Domain=${_data.domain}`
  if (_data.secure) cookieString += `; Secure`
  if (_data.sameSite) cookieString += `; SameSite=${_data.sameSite}`
  document.cookie = cookieString
}
export function findCookie(_name: string): unknown | null {
  const matches = document.cookie.matchAll(COOKIE_PAIR_REGEX)
  for (const match of matches)
    if (decodeURIComponent(match[1] ?? "") === _name)
      return JSON.parse(decodeURIComponent(match[2] ?? ""))
  return null
}
export function expireCookie(_name: string, _path: string = DEFAULT_PATH): void {
  setCookie(_name, { value: "", expires: new Date(0) }, _path)
}
export function listCookies(): Record<string, unknown> {
  const cookies: Record<string, unknown> = {}
  const matches = document.cookie.matchAll(COOKIE_PAIR_REGEX)
  for (const match of matches)
    cookies[decodeURIComponent(match[1] ?? "")] = JSON.parse(decodeURIComponent(match[2] ?? ""))
  return cookies
}