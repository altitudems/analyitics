import type { AnalyticsEvent } from './types'
import { storageGetJson, storageSetJson } from './storage'

const QUEUE_KEY = 'queue'

export class EventQueue {
  private memory: AnalyticsEvent[] = []

  constructor(private readonly persist: boolean) {
    if (persist) {
      this.memory = storageGetJson<AnalyticsEvent[]>(QUEUE_KEY) ?? []
    }
  }

  get size(): number {
    return this.memory.length
  }

  peekAll(): AnalyticsEvent[] {
    return [...this.memory]
  }

  enqueue(event: AnalyticsEvent): void {
    this.memory.push(event)
    this.save()
  }

  /** Remove and return up to `count` events from the front. */
  dequeue(count: number): AnalyticsEvent[] {
    const batch = this.memory.splice(0, count)
    this.save()
    return batch
  }

  /** Put events back at the front (after a failed send). */
  requeue(events: AnalyticsEvent[]): void {
    this.memory = [...events, ...this.memory]
    this.save()
  }

  clear(): void {
    this.memory = []
    this.save()
  }

  private save(): void {
    if (!this.persist) return
    storageSetJson(QUEUE_KEY, this.memory)
  }
}
