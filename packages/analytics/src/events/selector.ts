function escapeIdent(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1')
}

/**
 * Build a reasonably stable CSS selector for an element without external deps.
 * Prefers `#id`, then a short tag path with `:nth-of-type` when needed.
 */
export function getElementSelector(element: Element): string {
  if (element.id) {
    return `#${escapeIdent(element.id)}`
  }

  const parts: string[] = []
  let current: Element | null = element

  while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
    if (current.id) {
      parts.unshift(`#${escapeIdent(current.id)}`)
      break
    }

    const tag = current.tagName.toLowerCase()
    const parentElement: Element | null = current.parentElement
    let part = tag

    if (parentElement) {
      const siblings = Array.from(parentElement.children).filter(
        (child): child is Element => child.tagName === current?.tagName,
      )
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`
      }
    }

    parts.unshift(part)
    current = parentElement
  }

  return parts.join(' > ') || element.tagName.toLowerCase()
}
