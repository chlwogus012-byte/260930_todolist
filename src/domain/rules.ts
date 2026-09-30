import type { Item } from './types'
import { addDays, toDateKey } from './dates'
import { itemsOnDay } from './calendar'

export type Quadrant = 1 | 2 | 3 | 4

export function effectiveDue(item: Item): string | null {
  if (item.dueDate) return item.dueDate
  if (item.startAt) return toDateKey(new Date(item.startAt))
  return null
}

export function isOverdue(item: Item, today: string): boolean {
  const due = effectiveDue(item)
  return !item.done && due !== null && due < today
}

export function isUrgent(item: Item, today: string): boolean {
  const due = effectiveDue(item)
  return !item.done && due !== null && due <= addDays(today, 1)
}

export function quadrant(item: Item, today: string): Quadrant {
  const urgent = isUrgent(item, today)
  if (item.important) return urgent ? 1 : 2
  return urgent ? 3 : 4
}

function rank(item: Item, today: string): number {
  return isOverdue(item, today) ? 0 : quadrant(item, today)
}

export function todayList(items: Item[], today: string): Item[] {
  return items
    .filter((i) => {
      const due = effectiveDue(i)
      return !i.done && due !== null && due <= today
    })
    .sort((a, b) => {
      const r = rank(a, today) - rank(b, today)
      if (r !== 0) return r
      const d = effectiveDue(a)!.localeCompare(effectiveDue(b)!)
      if (d !== 0) return d
      return (a.startAt ?? '').localeCompare(b.startAt ?? '') || a.title.localeCompare(b.title)
    })
}

export function todayTodos(items: Item[], today: string): Item[] {
  const shown = new Set(itemsOnDay(items, today).events.map((e) => e.id))
  return todayList(items, today).filter((i) => !shown.has(i.id))
}

export function validateItem(v: {
  title: string
  startAt: string | null
  endAt: string | null
}): string | null {
  if (v.title.trim() === '') return '제목을 입력하세요.'
  if (v.endAt && !v.startAt) return '종료 시각에는 시작 시각이 필요합니다.'
  if (v.startAt && v.endAt && new Date(v.endAt) < new Date(v.startAt)) {
    return '종료 시각은 시작 시각 이후여야 합니다.'
  }
  return null
}

function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 86400000)
}

export function dueLabel(due: string, today: string): string {
  const diff = dayNumber(due) - dayNumber(today)
  if (diff < 0) return `${-diff}일 지남`
  if (diff === 0) return '오늘'
  if (diff === 1) return '내일'
  return due.slice(5)
}
