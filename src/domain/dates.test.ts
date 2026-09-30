import { test, expect } from 'vitest'
import { toDateKey, addDays, toLocalInput, fromLocalInput } from './dates'

test('toDateKey uses local components, not UTC', () => {
  expect(toDateKey(new Date(2026, 8, 30, 0, 30))).toBe('2026-09-30')
  expect(toDateKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30')
})
test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
})
test('local input round trip', () => {
  const iso = fromLocalInput('2026-09-30T00:30')!
  expect(toLocalInput(iso)).toBe('2026-09-30T00:30')
  expect(fromLocalInput('')).toBeNull()
  expect(toLocalInput(null)).toBe('')
})
