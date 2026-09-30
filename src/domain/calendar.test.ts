import { test, expect } from 'vitest'
import type { Item } from './types'
import { weekDays, monthGrid, itemsOnDay } from './calendar'

const mk = (o: Partial<Item>): Item => ({
  id: 'x', title: 't', important: false, dueDate: null, startAt: null, endAt: null, done: false, ...o,
})

test('weekDays starts on Sunday', () => {
  expect(weekDays('2026-09-30')).toEqual([
    '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
  ])
})

test('monthGrid covers the month in full weeks', () => {
  const g = monthGrid('2026-09-15')
  expect(g[0][0]).toBe('2026-08-30')
  expect(g[g.length - 1][6]).toBe('2026-10-03')
  expect(g.every((w) => w.length === 7)).toBe(true)
})

test('overnight event appears only on its start day', () => {
  const ev = mk({
    id: 'night',
    startAt: new Date(2026, 8, 30, 23, 0).toISOString(),
    endAt: new Date(2026, 9, 1, 1, 0).toISOString(),
  })
  expect(itemsOnDay([ev], '2026-09-30').events.map((i) => i.id)).toEqual(['night'])
  expect(itemsOnDay([ev], '2026-10-01').events).toEqual([])
})

test('events sorted by start; todos are timeless items on due date; done items kept', () => {
  const a = mk({ id: 'a', startAt: new Date(2026, 8, 30, 15, 0).toISOString() })
  const b = mk({ id: 'b', startAt: new Date(2026, 8, 30, 9, 0).toISOString(), done: true })
  const t = mk({ id: 't', dueDate: '2026-09-30' })
  const r = itemsOnDay([a, b, t], '2026-09-30')
  expect(r.events.map((i) => i.id)).toEqual(['b', 'a'])
  expect(r.todos.map((i) => i.id)).toEqual(['t'])
})
