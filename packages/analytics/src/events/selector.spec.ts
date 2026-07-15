import { getElementSelector } from './selector'

describe('getElementSelector', () => {
  it('prefers element ids', () => {
    const el = document.createElement('button')
    el.id = 'my-btn'
    document.body.appendChild(el)

    expect(getElementSelector(el)).toBe('#my-btn')
    el.remove()
  })

  it('builds a path when there is no id', () => {
    const wrap = document.createElement('div')
    const el = document.createElement('span')
    wrap.appendChild(el)
    document.body.appendChild(wrap)

    expect(getElementSelector(el)).toContain('span')
    wrap.remove()
  })
})
