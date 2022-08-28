import { AnalyticsContext, getContext } from './context'
import { AnalyticsEvent, AnalyticsEventData, EventTypes, eventFactory } from './events'

export interface AnalyticsClient {
  context: AnalyticsContext
  events: AnalyticsEvent[]

  pageView(options?: { label?: string; data?: AnalyticsEventData; timestamp?: number }): AnalyticsEvent

  pageExit(options?: { label?: string; data?: AnalyticsEventData; timestamp?: number }): AnalyticsEvent

  click(options?: {
    label?: string
    data?: AnalyticsEventData
    event?: Event
    element?: Element
    timestamp?: number
  }): AnalyticsEvent
  action(options?: {
    label?: string
    data?: AnalyticsEventData
    event?: Event
    element?: Element
    timestamp?: number
  }): AnalyticsEvent
  error(options?: {
    label?: string
    data?: AnalyticsEventData
    event?: Event
    element?: Element
    timestamp?: number
    message?: string
    source?: string
    lineno?: number
    colno?: number
    error?: Error
  }): AnalyticsEvent

  onLoad(event?: Event): void
  onUnload(event?: Event): void
  onError(event?: ErrorEvent): void
}

export default function createClient(options?: { disableErrorWatching?: boolean }): AnalyticsClient {
  options = options || { disableErrorWatching: false }

  const context = getContext()

  const client: AnalyticsClient = {
    context,
    events: [],

    pageView(options) {
      const event = eventFactory({
        label: 'Page View',
        ...options,
        type: EventTypes.pageView,
        context,
      })
      this.events.push(event)
      return event
    },

    pageExit(options) {
      const event = eventFactory({
        label: 'Page Exit',
        ...options,
        type: EventTypes.pageExit,
        context,
      })
      this.events.push(event)
      return event
    },

    click(options) {
      const event = eventFactory({ label: 'Click', ...options, type: EventTypes.click, context })
      this.events.push(event)
      return event
    },

    action(options) {
      const event = eventFactory({ label: 'Action', ...options, type: EventTypes.action, context })
      this.events.push(event)
      return event
    },

    error(options) {
      const event = eventFactory({ label: 'Error', ...options, type: EventTypes.error, context })
      this.events.push(event)
      return event
    },

    onLoad() {
      this.pageView()
    },

    onUnload() {
      this.pageExit()
    },

    onError(event: ErrorEvent) {
      const { message, source, lineno, colno, error } = event?.error || new Error('unknown')
      client.error({
        data: { message, source, lineno, colno, error },
      })
    },
  }

  if (!options.disableErrorWatching) {
    window.addEventListener('error', client.onError.bind(client))
  }

  if (document.readyState !== 'complete') {
    // loading yet, wait for the event
    document.addEventListener('DOMContentLoaded', client.onLoad.bind(client))
  } else {
    // DOM is ready!
    client.onLoad.bind(client)
  }

  window.addEventListener('unload', client.onUnload.bind(client))

  return client
}
