import { test, expect } from 'vitest'
import type { Item } from './types'
import { effectiveDue, isOverdue, isUrgent, quadrant, todayList, validateItem } from './rules'

const T = '2026-09-30'
const mk = (o: Partial<Item> = {}): Item => ({
  id: 'x', title: 't', important: false, dueDate: null, startAt: null, endAt: null, done: false, ...o,
})

test('effectiveDue falls back to start date', () => {
  expect(effectiveDue(mk({ dueDate: '2026-10-05' }))).toBe('2026-10-05')
  expect(effectiveDue(mk({ startAt: new Date(2026, 9, 2, 9, 0).toISOString() }))).toBe('2026-10-02')
  expect(effectiveDue(mk())).toBeNull()
})

test('urgency boundaries: yesterday, today, tomorrow, day after, none', () => {
  expect(isUrgent(mk({ dueDate: '2026-09-29' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-09-30' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-10-01' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-10-02' }), T)).toBe(false)
  expect(isUrgent(mk(), T)).toBe(false)
})

test('done items are never urgent or overdue', () => {
  expect(isUrgent(mk({ dueDate: '2026-09-29', done: true }), T)).toBe(false)
  expect(isOverdue(mk({ dueDate: '2026-09-29', done: true }), T)).toBe(false)
})

test('isOverdue only before today', () => {
  expect(isOverdue(mk({ dueDate: '2026-09-29' }), T)).toBe(true)
  expect(isOverdue(mk({ dueDate: '2026-09-30' }), T)).toBe(false)
})

test('quadrants', () => {
  expect(quadrant(mk({ important: true, dueDate: T }), T)).toBe(1)
  expect(quadrant(mk({ important: true, dueDate: '2026-12-01' }), T)).toBe(2)
  expect(quadrant(mk({ important: true }), T)).toBe(2)
  expect(quadrant(mk({ dueDate: T }), T)).toBe(3)
  expect(quadrant(mk({}), T)).toBe(4)
})

test('todayList filters and orders: overdue, Q1, Q2, Q3, Q4, then earliest due', () => {
  const items = [
    mk({ id: 'nodue', dueDate: null }),
    mk({ id: 'future', dueDate: '2026-10-09' }),
    mk({ id: 'done', dueDate: T, done: true }),
    mk({ id: 'q3', dueDate: T }),
    mk({ id: 'q1b', dueDate: '2026-09-30', important: true }),
    mk({ id: 'overdue-late', dueDate: '2026-09-29' }),
    mk({ id: 'overdue-early', dueDate: '2026-09-20', important: true }),
  ]
  expect(todayList(items, T).map((i) => i.id)).toEqual([
    'overdue-early', 'overdue-late', 'q1b', 'q3',
  ])
})

test('validateItem', () => {
  expect(validateItem({ title: '  ', startAt: null, endAt: null })).toMatch(/제목/)
  expect(validateItem({ title: '', startAt: null, endAt: null })).toMatch(/제목/)
  expect(validateItem({ title: 'a', startAt: null, endAt: null })).toBeNull()
  const s = '2026-09-30T10:00:00.000Z'
  expect(validateItem({ title: 'a', startAt: s, endAt: '2026-09-30T09:00:00.000Z' })).toMatch(/종료/)
  expect(validateItem({ title: 'a', startAt: s, endAt: s })).toBeNull()
  expect(validateItem({ title: 'a', startAt: null, endAt: s })).toMatch(/시작/)
})
