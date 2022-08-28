import { v4 as uuid } from 'uuid'
import finder from '@medv/finder'
import { AnalyticsContext } from '../context'

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
 *
 * @export
 * @param {{
 *   context: AnalyticsContext
 *   type?: EventTypes
 *   label?: string
 *   data?: AnalyticsEventData
 *   event?: Event
 *   element?: Element
 *   timestamp?: number
 * }} options
 * @returns {AnalyticsEvent}
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
  // Try and resolve the element
  const element = options.element || (options.event?.target as Element)

  // Create new event
  const event: AnalyticsEvent = {
    id: uuid(),
    context: options.context,
    label: options.label || 'Event',
    type: options.type || EventTypes.event,
    data: {},
    timestamp: options.timestamp || new Date().valueOf(),
  }

  // If element exists, record details about it
  if (element != null) {
    event.data.elementSelector = finder(element)
    event.data.elementText = element.textContent ? element.textContent.trim() : ''
  }

  // Merge input data if any
  if (options.data && typeof options.data === 'object') {
    event.data = { ...event.data, ...options.data }
  }

  return event
}
