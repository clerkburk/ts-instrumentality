import { AnyErr } from "./base.js"



export function rm_fileprotocol_from_src(_rawPath: string): string {
  return _rawPath.replace(/^file:\/\/\//, "");
}



export class DOMErr extends AnyErr {
  constructor(_identifier: string, _msg: string) {
    super(`At state '${document.readyState}' from type, class or id '${_identifier}' because: ${_msg}`)
  }
}



export function ready(): Promise<void> {
  return new Promise((resolve) => {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => resolve())
  else
    resolve()
  })
}




export function by_id<T extends HTMLElement>(_id: string, _elementType?: new () => T): T {
  const element = document.getElementById(_id)
  const typeCtor = _elementType ?? HTMLElement
  if (!(element instanceof typeCtor))
    throw new DOMErr(_id, `Type missmatch: Element is not of type ${typeCtor.name} but ${element?.constructor.name}`)
  return element as T
}



export function by_class<T extends HTMLElement>(_className: string, _elementType?: new() => T): T[] {
  const typeCtor = _elementType ?? HTMLElement
  const cleanClass = _className.startsWith('.') ? _className.slice(1) : _className
  const elements = document.querySelectorAll(`.${cleanClass}`)
  const result: T[] = []

  elements.forEach((element, index) => {
    if (!(element instanceof typeCtor))
    throw new DOMErr(_className, `Type missmatch at index ${index}: Element is not of type ${typeCtor.name}`)
    result.push(element as T)
  })

  return result
}


export function by_tag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][] {
  return Array.from(document.getElementsByTagName(_tagName))
}



export function id_exists<T extends HTMLElement>(_id: string, _elementType?: new() => T): boolean {
  const typeCtor = _elementType ?? HTMLElement
  const maybeElement = document.getElementById(_id)
  if (!maybeElement || !(maybeElement instanceof typeCtor))
    return false
  return true
}