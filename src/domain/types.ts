export type Item = {
  id: string
  title: string
  important: boolean
  dueDate: string | null
  startAt: string | null
  endAt: string | null
  done: boolean
}
export type ItemInput = Omit<Item, 'id' | 'done'> & { done?: boolean }
