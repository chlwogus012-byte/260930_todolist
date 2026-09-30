import { test, expect, beforeAll, describe } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'

const env = loadEnv('test', process.cwd(), 'VITE_')
const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
const run = Date.now()

async function signedIn(tag: string): Promise<SupabaseClient> {
  const c = createClient(url, key, { auth: { persistSession: false } })
  const email = `rls-${tag}-${run}@example.com`
  const password = 'Test-pass-12345'
  const { error } = await c.auth.signUp({ email, password })
  if (error) throw error
  const { error: e2 } = await c.auth.signInWithPassword({ email, password })
  if (e2) throw e2
  return c
}

// Skipped (not passed) when no Supabase project is configured in .env
describe.skipIf(!url || !key)('items row level security', () => {
  let a: SupabaseClient
  let b: SupabaseClient
  let aItemId: string

  beforeAll(async () => {
    a = await signedIn('a')
    b = await signedIn('b')
    const { data, error } = await a.from('items').insert({ title: 'A only' }).select().single()
    if (error) throw error
    aItemId = data.id
  }, 30000)

  test('B cannot read A items', async () => {
    const { data, error } = await b.from('items').select().eq('id', aItemId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  test('B cannot modify or delete A items', async () => {
    await b.from('items').update({ title: 'hacked' }).eq('id', aItemId)
    await b.from('items').delete().eq('id', aItemId)
    const { data } = await a.from('items').select().eq('id', aItemId).single()
    expect(data?.title).toBe('A only')
  })

  test('B cannot insert an item owned by A', async () => {
    const { data: u } = await a.auth.getUser()
    const { error } = await b.from('items').insert({ title: 'spoof', owner: u.user!.id })
    expect(error).not.toBeNull()
  })

  test('anonymous client sees nothing', async () => {
    const anon = createClient(url, key, { auth: { persistSession: false } })
    const { data } = await anon.from('items').select()
    expect(data ?? []).toEqual([])
  })

  test('DB rejects blank title and end before start', async () => {
    const blank = await a.from('items').insert({ title: '   ' })
    expect(blank.error).not.toBeNull()
    const bad = await a.from('items').insert({
      title: 'x', start_at: '2026-09-30T10:00:00Z', end_at: '2026-09-30T09:00:00Z',
    })
    expect(bad.error).not.toBeNull()
  })
})
