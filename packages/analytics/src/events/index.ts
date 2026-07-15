import type { AnalyticsContext } from '../context'
import { createId } from '../id'
import { getElementSelector } from './selector'

export enum EventTypes {
  pageExit = 'pageExit',
  pageView = 'pageView',
  event = 'event',
  action = 'action',
  click = 'click',
  error = 'error',
}

export interface AnalyticsEventData {
  elementSelector?: string
  elementText?: string
  [key: string]: unknown
}

export interface AnalyticsEvent {
  id: string
  type: string
  label: string
  timestamp: number
  data: AnalyticsEventData
  context: AnalyticsContext
}

/**
 * Creates a new base AnalyticsEvent object
 */
export function eventFactory(options: {
  context: AnalyticsContext
  type?: EventTypes
  label?: string
  data?: AnalyticsEventData
  event?: Event
  element?: Element
  timestamp?: number
}): AnalyticsEvent {
  const element = options.element || (options.event?.target as Element)

  const event: AnalyticsEvent = {
    id: createId(),
    context: options.context,
    label: options.label || 'Event',
    type: options.type || EventTypes.event,
    data: {},
    timestamp: options.timestamp || Date.now(),
  }

  if (element != null) {
    event.data.elementSelector = getElementSelector(element)
    event.data.elementText = element.textContent ? element.textContent.trim() : ''
  }

  if (options.data && typeof options.data === 'object') {
    event.data = { ...event.data, ...options.data }
  }

  return event
}
