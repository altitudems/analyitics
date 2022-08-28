import { AnalyticsClient } from '../client'
import { setupEnvironment } from '../../tests/unit/helpers/setup'
import { EventTypes, eventFactory } from '.'

let client: AnalyticsClient

describe('client.events', () => {
  beforeAll(() => {
    client = setupEnvironment()
  })

  describe('eventFactory', () => {
    beforeAll(() => {
      const el = document.createElement('button')
      el.id = 'my-btn'
      el.innerHTML = 'Btn Label'
      document.body.appendChild(el)
    })
    afterAll(() => {
      const el = document.getElementById('my-btn')
      if (el) document.body.removeChild(el)
    })

    it('outputs event', () => {
      const event = eventFactory({
        label: 'User Performed Action',
        context: client.context,
        data: {},
      })
      expect(event).toBeDefined()
      expect(event.type).toBe(EventTypes.event)
    })

    it('event type is assigned', () => {
      const event = eventFactory({
        type: EventTypes.action,
        context: client.context,
      })
      expect(event).toBeDefined()
      expect(event.type).toBe(EventTypes.action)
    })

    it('given button element, returns element text', () => {
      const el = document.getElementById('my-btn')
      const event = eventFactory({
        label: 'Custom Event',
        context: client.context,
        data: {},
        element: el || undefined,
      })
      expect(event.data.elementText).toBe('Btn Label')
    })

    it('given empty div element, returns no elementText', () => {
      const el = document.createElement('div')
      el.id = 'empty-div'
      document.body.appendChild(el)
      const event = eventFactory({
        context: client.context,
        element: el,
      })

      expect(event.data.elementText).toBe('')
    })

    it('given button element, returns element selector', () => {
      const el = document.getElementById('my-btn')
      const event = eventFactory({
        label: 'Custom Event',
        context: client.context,
        data: {},
        element: el || undefined,
      })
      expect(event.data.elementSelector).toBe('#my-btn')
    })

    it('merges input data with output data', () => {
      const el = document.getElementById('my-btn')

      const event = eventFactory({
        label: 'User Performed Action',
        context: client.context,
        data: {
          someOtherData: 'some value',
        },
        element: el || undefined,
      })
      expect(event.data.someOtherData).toBe('some value')
      expect(event.data.elementSelector).toBe('#my-btn')
      expect(event.data.elementText).toBe('Btn Label')
    })

    it('from a click event, returns element selector', (done) => {
      const el = document.getElementById('my-btn')
      if (el) {
        el.addEventListener('click', (e) => {
          const event = eventFactory({
            label: 'User Performed Action',
            context: client.context,
            data: {},
            event: e,
          })

          expect(event.data.elementSelector).toBe('#my-btn')

          done()
        })

        el.click()
      }
    })

    it('outputs allows label override', () => {
      const event = eventFactory({
        label: 'Clickity',
        context: client.context,
      })
      expect(event).toBeDefined()
      expect(event.label).toBe('Clickity')
    })
  })
})
