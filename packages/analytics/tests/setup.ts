/**
 * @medv/finder v4 relies on CSS.escape, which jsdom does not provide.
 */
if (typeof globalThis.CSS === 'undefined' || typeof globalThis.CSS.escape !== 'function') {
  const escape = (value: string): string =>
    // eslint-disable-next-line no-control-regex -- CSS.escape polyfill for jsdom
    String(value).replace(/([\0-\x1f\x7f]|^-?\d)|^-$|[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, (ch, isControl) => {
      if (isControl) {
        const code = ch.charCodeAt(0)
        if (code === 0) return '\uFFFD'
        if (code <= 0x1f || code === 0x7f) return `\\${code.toString(16)} `
      }
      return `\\${ch}`
    })

  Object.defineProperty(globalThis, 'CSS', {
    value: { ...(globalThis.CSS ?? {}), escape },
    configurable: true,
  })
}
