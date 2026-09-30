import { test, expect } from 'vitest'
import { rowToItem, inputToRow } from './mapping'

test('rowToItem maps snake_case to Item', () => {
  expect(rowToItem({
    id: '1', title: 'a', important: true, due_date: '2026-09-30',
    start_at: null, end_at: null, done: false,
  })).toEqual({
    id: '1', title: 'a', important: true, dueDate: '2026-09-30',
    startAt: null, endAt: null, done: false,
  })
})

test('inputToRow trims title and omits owner', () => {
  const row = inputToRow({
    title: '  a  ', important: false, dueDate: null, startAt: null, endAt: null,
  })
  expect(row.title).toBe('a')
  expect('owner' in row).toBe(false)
})

test('inputToRow on a partial patch only includes given fields', () => {
  expect(inputToRow({ done: true })).toEqual({ done: true })
})
