import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../data/supabase'
import { useItems } from '../state/useItems'
import { toDateKey } from '../domain/dates'
import type { Item } from '../domain/types'
import { Login } from './Login'
import { ErrorBanner } from './ErrorBanner'
import { ItemModal, type Draft } from './ItemModal'
import { TodayView } from './TodayView'
import { CalendarView } from './CalendarView'
import { MatrixView } from './MatrixView'
import './styles.css'

type Tab = 'today' | 'calendar' | 'matrix'
const blank: Draft = { id: null, title: '', important: false, dueDate: null, startAt: null, endAt: null }

export function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />
  return <Main />
}

function Main() {
  const { items, error, loading, reload, save, toggleDone, remove, clearError } = useItems()
  const [tab, setTab] = useState<Tab>('today')
  const [draft, setDraft] = useState<Draft | null>(null)
  const today = toDateKey(new Date())

  const openNew = (prefill: Partial<Draft> = {}) => setDraft({ ...blank, ...prefill })
  const openEdit = (i: Item) => setDraft({ id: i.id, title: i.title, important: i.important, dueDate: i.dueDate, startAt: i.startAt, endAt: i.endAt })

  return (
    <div className="app">
      {error && <ErrorBanner message={error} onRetry={() => { clearError(); void reload() }} />}
      <main>
        {loading && <p className="muted">불러오는 중…</p>}
        {!loading && tab === 'today' && <TodayView items={items} today={today} onToggle={toggleDone} onOpen={openEdit} />}
        {!loading && tab === 'calendar' && <CalendarView items={items} today={today} onOpen={openEdit} onNew={openNew} onToggle={toggleDone} />}
        {!loading && tab === 'matrix' && <MatrixView items={items} today={today} onOpen={openEdit} />}
      </main>
      <nav>
        <button className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}><i>◎</i>오늘</button>
        <button className={tab === 'calendar' ? 'on' : ''} onClick={() => setTab('calendar')}><i>▦</i>캘린더</button>
        <button className="add" aria-label="항목 추가" onClick={() => openNew({ dueDate: tab === 'today' ? today : null })}>＋</button>
        <button className={tab === 'matrix' ? 'on' : ''} onClick={() => setTab('matrix')}><i>▤</i>매트릭스</button>
        <button onClick={() => void supabase.auth.signOut()}><i>⎋</i>로그아웃</button>
      </nav>
      {draft && (
        <ItemModal
          draft={draft}
          onSave={(input) => save(draft.id, input)}
          onDelete={draft.id ? () => { void remove(draft.id!); setDraft(null) } : undefined}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  )
}
