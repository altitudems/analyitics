/**
 * @medv/finder v4 relies on CSS.escape, which jsdom does not provide.
 */
if (typeof globalThis.CSS === 'undefined' || typeof globalThis.CSS.escape !== 'function') {
  const cssEscape = (value: string): string =>
    String(value).replace(
      // biome-ignore lint/suspicious/noControlCharactersInRegex: CSS.escape polyfill for jsdom
      /([\0-\x1f\x7f]|^-?\d)|^-$|[ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g,
      (ch, isControl) => {
        if (isControl) {
          const code = ch.charCodeAt(0)
          if (code === 0) return '\uFFFD'
          if (code <= 0x1f || code === 0x7f) return `\\${code.toString(16)} `
        }
        return `\\${ch}`
      },
    )

  Object.defineProperty(globalThis, 'CSS', {
    value: { ...(globalThis.CSS ?? {}), escape: cssEscape },
    configurable: true,
  })
}
