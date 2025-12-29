if (typeof document === 'undefined' || typeof window === 'undefined')
  throw new Error("This module can only be used in a browser (or similar) environment where 'document' and 'window' are defined.")



/**
 * Returns a Promise that resolves when the DOM is fully loaded and ready.
 *
 * @returns A Promise that resolves when the DOM is ready.
 */
export function once_ready(): Promise<void> {
  if (document.readyState === "complete" || document.readyState === "interactive")
    return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => resolve(), { once: true })
  })
}



/**
 * Retrieves an HTML element by its ID and ensures it matches the specified type.
 *
 * @param _id - The ID of the HTML element to retrieve.
 * @param _elementType - An optional constructor function for the expected element type.
 * @returns The HTML element with the specified ID and type.
 * @throws Will throw an error if the element is not found or does not match the expected type.
 */
export function by_id<T extends HTMLElement>(_id: string, _elementType?: new () => T): T {
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
export function by_class<T extends HTMLElement>(_className: string, _elementType?: new() => T): T[] {
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
export function by_tag<K extends keyof HTMLElementTagNameMap>(_tagName: K): HTMLElementTagNameMap[K][] {
  return Array.from(document.getElementsByTagName(_tagName))
}