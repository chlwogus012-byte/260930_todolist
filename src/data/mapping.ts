import type { Item, ItemInput } from '../domain/types'

export type Row = {
  id: string
  title: string
  important: boolean
  due_date: string | null
  start_at: string | null
  end_at: string | null
  done: boolean
}

export function rowToItem(r: Row): Item {
  return {
    id: r.id, title: r.title, important: r.important, dueDate: r.due_date,
    startAt: r.start_at, endAt: r.end_at, done: r.done,
  }
}

export function inputToRow(i: Partial<ItemInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (i.title !== undefined) row.title = i.title.trim()
  if (i.important !== undefined) row.important = i.important
  if (i.dueDate !== undefined) row.due_date = i.dueDate
  if (i.startAt !== undefined) row.start_at = i.startAt
  if (i.endAt !== undefined) row.end_at = i.endAt
  if (i.done !== undefined) row.done = i.done
  return row
}
