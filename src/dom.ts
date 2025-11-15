export async function once_ready(): Promise<void> {
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
    throw new Error(`Type missmatch: Element with id '${_id}' is not of type ${typeCtor.name}`)
  return element as T
}



export function by_class<T extends HTMLElement>(_className: string, _elementType?: new() => T): T[] {
  const typeCtor = _elementType ?? HTMLElement
  const cleanClass = _className.startsWith('.') ? _className.slice(1) : _className
  const elements = document.querySelectorAll(`.${cleanClass}`)
  const result: T[] = []

  elements.forEach((element, index) => {
    if (!(element instanceof typeCtor))
      throw new Error(`Type missmatch: Element at index ${index} with class '${_className}' is not of type ${typeCtor.name}`)
    result.push(element as T)
  })

  return result
}


export function by_tag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][] {
  return Array.from(document.getElementsByTagName(_tagName))
}



export function create_element<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K] {
  return document.createElement(_tagName)
}


export function delete_element_by_id(_id: string): void {
  const element = document.getElementById(_id)
  element?.remove()
}