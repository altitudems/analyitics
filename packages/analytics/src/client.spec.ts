import { AnalyticsClient } from './client'
import { setupEnvironment } from '../tests/unit/helpers/setup'
import { EventTypes } from './events/index'

describe('client', () => {
  let client: AnalyticsClient

  beforeAll(() => {
    client = setupEnvironment()
  })

  it('has events', () => {
    expect(client.events).toBeDefined()
  })

  it('pageView is called on window load', () => {
    // Simulate unload event
    client.onLoad(new Event('load'))
    expect(client.events.find((e) => e.type === EventTypes.pageView)).toBeDefined()
  })

  it('pageView() returns event with default label', () => {
    client.pageView({ data: { id: 'defualt-label' } })
    expect(client.events.find((e) => e.data.id === 'defualt-label' && e.label === 'Page View')).toBeDefined()
  })

  it('pageView() adds a new pageView event with data we specified', () => {
    client.pageView({ data: { id: 'page' } })
    expect(client.events.find((e) => e.type === EventTypes.pageView && e.data.id === 'page')).toBeDefined()
  })

  describe('pageExit()', () => {
    it('pageExit is called on window unload', () => {
      // Simulate unload event
      client.onUnload(new Event('unload'))
      expect(client.events.find((e) => e.type === EventTypes.pageExit)).toBeDefined()
    })

    it('pageExit() adds a new pageExit event with data we specified', () => {
      client.pageExit({ data: { id: 'page' } })
      expect(client.events.find((e) => e.type === EventTypes.pageExit && e.data.id === 'page')).toBeDefined()
    })
  })

  it('action() adds a new action event with label specified', () => {
    client.action({ label: 'Dismissed Notification' })
    expect(
      client.events.find((e) => e.type === EventTypes.action && e.label === 'Dismissed Notification'),
    ).toBeDefined()
  })

  it('click() adds a new click event with label specified', () => {
    client.click({ label: 'Clicked Buy' })
    expect(client.events.find((e) => e.type === EventTypes.click && e.label === 'Clicked Buy')).toBeDefined()
  })

  describe('errors', () => {
    it('error() adds a new error event with data specified', () => {
      client.error({
        label: 'Custom Error',
        data: {
          message: 'Error Message',
          source: 'file.js',
          lineno: 10,
          colno: 13,
          error: null,
        },
      })
      expect(client.events.find((e) => e.type === EventTypes.error && e.label === 'Custom Error')).toBeDefined()
    })
    it('throwing an error creates a new error event', () => {
      client.onError(new ErrorEvent('error', { error: new Error('My Error') }))
      const errorEvent = client.events[client.events.length - 1]
      expect(errorEvent).toBeDefined()
      expect(errorEvent?.data.message).toBe('My Error')
    })
  })
})
