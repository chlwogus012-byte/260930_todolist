import { useCallback, useEffect, useState } from 'react'
import type { Item, ItemInput } from '../domain/types'
import { validateItem } from '../domain/rules'
import { createItem, deleteItem, listItems, updateItem } from '../data/items'

export function useItems() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try {
      setItems(await listItems())
      setError(null)
    } catch {
      setError('불러오지 못했습니다. 네트워크를 확인하고 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void reload() }, [reload])

  async function save(id: string | null, input: ItemInput): Promise<boolean> {
    const invalid = validateItem(input)
    if (invalid) { setError(invalid); return false }
    try {
      const saved = id ? await updateItem(id, input) : await createItem(input)
      setItems((prev) => id ? prev.map((i) => (i.id === id ? saved : i)) : [...prev, saved])
      setError(null)
      return true
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
      return false
    }
  }

  async function toggleDone(item: Item) {
    try {
      const saved = await updateItem(item.id, { done: !item.done })
      setItems((prev) => prev.map((i) => (i.id === item.id ? saved : i)))
    } catch {
      setError('저장하지 못했습니다. 다시 시도하세요.')
    }
  }

  async function remove(id: string) {
    try {
      await deleteItem(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setError('삭제하지 못했습니다. 다시 시도하세요.')
    }
  }

  return { items, error, loading, reload, save, toggleDone, remove, clearError: () => setError(null) }
}
