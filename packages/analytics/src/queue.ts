import type { AnalyticsEvent } from './types'
import { storageGetJson, storageSetJson } from './storage'

const QUEUE_KEY = 'queue'

export class EventQueue {
  private memory: AnalyticsEvent[] = []

  constructor(
    private readonly persist: boolean,
    private readonly maxSize: number,
  ) {
    if (persist) {
      this.memory = storageGetJson<AnalyticsEvent[]>(QUEUE_KEY) ?? []
      this.trim()
    }
  }

  get size(): number {
    return this.memory.length
  }

  enqueue(event: AnalyticsEvent): void {
    this.memory.push(event)
    this.trim()
    this.save()
  }

  /** Take up to `count` events from the front. */
  dequeue(count: number): AnalyticsEvent[] {
    const batch = this.memory.splice(0, Math.max(0, count))
    this.save()
    return batch
  }

  requeue(events: AnalyticsEvent[]): void {
    this.memory = [...events, ...this.memory]
    this.trim()
    this.save()
  }

  clear(): void {
    this.memory = []
    this.save()
  }

  private trim(): void {
    if (this.memory.length <= this.maxSize) return
    // Drop oldest so the queue cannot grow without bound
    this.memory = this.memory.slice(this.memory.length - this.maxSize)
  }

  private save(): void {
    if (!this.persist) return
    storageSetJson(QUEUE_KEY, this.memory)
  }
}
