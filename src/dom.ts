import * as bs from "./base.js"
if (typeof document === 'undefined' || typeof window === 'undefined')
  throw new Error("This module can only be used in a browser (or similar) environment where 'document' and 'window' are defined.")



export function once_ready(): Promise<void> {
  if (document.readyState === "complete" || document.readyState === "interactive")
    return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true })
  })
}



export function by_id<T extends HTMLElement>(_id: string, _elementType?: new () => T): T {
  const element = document.getElementById(_id)
  const typeCtor = _elementType ?? HTMLElement
  if (!(element instanceof typeCtor))
    throw new Error(`Type missmatch: Element with id '${_id}' is not of type ${typeCtor.name}`)
  return element as T
}



export function by_class<T extends HTMLElement>(_className: string, _elementType?: new() => T): T[] {
  return Array.from(document.getElementsByClassName(_className)).map((element, index) => {
    const typeCtor = _elementType ?? HTMLElement
    if (!(element instanceof typeCtor))
      throw new Error(`Type missmatch: Element at index ${index} with class '${_className}' is not of type ${typeCtor.name}`)
    return element as T
  })
}


export function by_tag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][] {
  return Array.from(document.getElementsByTagName(_tagName))
}