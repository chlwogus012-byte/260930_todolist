import type { Item, ItemInput } from '../domain/types'
import { supabase } from './supabase'
import { inputToRow, rowToItem, type Row } from './mapping'

export async function listItems(): Promise<Item[]> {
  const { data, error } = await supabase.from('items').select().order('created_at')
  if (error) throw error
  return (data as Row[]).map(rowToItem)
}

export async function createItem(input: ItemInput): Promise<Item> {
  const { data, error } = await supabase.from('items').insert(inputToRow(input)).select().single()
  if (error) throw error
  return rowToItem(data as Row)
}

export async function updateItem(id: string, patch: Partial<ItemInput>): Promise<Item> {
  const { data, error } = await supabase.from('items').update(inputToRow(patch)).eq('id', id).select().single()
  if (error) throw error
  return rowToItem(data as Row)
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}
