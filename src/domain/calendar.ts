import type { Item } from './types'
import { addDays, toDateKey } from './dates'

function dow(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function weekDays(anchor: string): string[] {
  const start = addDays(anchor, -dow(anchor))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function monthGrid(anchor: string): string[][] {
  const [y, m] = anchor.split('-').map(Number)
  const first = toDateKey(new Date(y, m - 1, 1))
  const last = toDateKey(new Date(y, m, 0))
  const weeks: string[][] = []
  let cur = addDays(first, -dow(first))
  while (cur <= last) {
    const start = cur
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)))
    cur = addDays(cur, 7)
  }
  return weeks
}

export function itemsOnDay(items: Item[], day: string): { events: Item[]; todos: Item[] } {
  const events = items
    .filter((i) => i.startAt && toDateKey(new Date(i.startAt)) === day)
    .sort((a, b) => a.startAt!.localeCompare(b.startAt!))
  const todos = items.filter((i) => !i.startAt && i.dueDate === day)
  return { events, todos }
}
