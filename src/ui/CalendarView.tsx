import { useState } from 'react'
import type { Item } from '../domain/types'
import type { Draft } from './ItemModal'
import { addDays, toDateKey, fromLocalInput } from '../domain/dates'
import { itemsOnDay, monthGrid, weekDays } from '../domain/calendar'

const HOUR_PX = 40
const p2 = (n: number) => String(n).padStart(2, '0')

type Handlers = {
  items: Item[]
  today: string
  onOpen: (i: Item) => void
  onNew: (p: Partial<Draft>) => void
  onToggle: (i: Item) => void
}

export function CalendarView(props: Handlers) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(props.today)
  const [dayList, setDayList] = useState<string | null>(null)

  const shift = (dir: number) => {
    if (mode === 'week') return setAnchor(addDays(anchor, dir * 7))
    const [y, m] = anchor.split('-').map(Number)
    setAnchor(toDateKey(new Date(y, m - 1 + dir, 1)))
  }

  return (
    <div>
      <div className="cal-head">
        <b>{anchor.slice(0, 4)}년 {Number(anchor.slice(5, 7))}월</b>
        <button onClick={() => shift(-1)}>◀</button>
        <button onClick={() => setAnchor(props.today)}>오늘</button>
        <button onClick={() => shift(1)}>▶</button>
        <button onClick={() => setMode(mode === 'week' ? 'month' : 'week')}>{mode === 'week' ? '월간' : '주간'}</button>
      </div>
      {mode === 'week' ? <Week {...props} anchor={anchor} /> : <Month {...props} anchor={anchor} onDay={setDayList} />}
      {dayList && <DayList {...props} day={dayList} onClose={() => setDayList(null)} />}
    </div>
  )
}

function Week(p: Handlers & { anchor: string }) {
  return (
    <div className="week">
      {weekDays(p.anchor).map((day) => {
        const { events, todos } = itemsOnDay(p.items, day)
        return (
          <div key={day}>
            <div className={day === p.today ? 'cell today' : 'cell'}>
              {Number(day.slice(8))}
              {todos.map((t) => (
                <div key={t.id} className={`marker${t.done ? ' done' : ''}`} onClick={() => p.onOpen(t)}>{t.important ? '★' : '•'} {t.title}</div>
              ))}
            </div>
            <div
              className="daycol"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_PX)))
                const endLocal = hour === 23 ? `${day}T23:59` : `${day}T${p2(hour + 1)}:00`
                p.onNew({ dueDate: day, startAt: fromLocalInput(`${day}T${p2(hour)}:00`), endAt: fromLocalInput(endLocal) })
              }}
            >
              {events.map((ev) => {
                const s = new Date(ev.startAt!)
                const startMin = s.getHours() * 60 + s.getMinutes()
                let endMin = startMin + 60
                if (ev.endAt) {
                  const e = new Date(ev.endAt)
                  endMin = toDateKey(e) === day ? e.getHours() * 60 + e.getMinutes() : 24 * 60
                }
                const height = Math.max(20, ((endMin - startMin) / 60) * HOUR_PX)
                return (
                  <div
                    key={ev.id}
                    className={`block${ev.important ? ' important' : ''}${ev.done ? ' done' : ''}`}
                    style={{ top: (startMin / 60) * HOUR_PX, height }}
                    onClick={(x) => { x.stopPropagation(); p.onOpen(ev) }}
                  >
                    {ev.title}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Month(p: Handlers & { anchor: string; onDay: (d: string) => void }) {
  const month = p.anchor.slice(0, 7)
  return (
    <div className="month">
      {monthGrid(p.anchor).flat().map((day) => {
        const { events, todos } = itemsOnDay(p.items, day)
        const cls = `cell${day === p.today ? ' today' : ''}${day.startsWith(month) ? '' : ' other'}`
        return (
          <div key={day} className={cls} onClick={() => p.onDay(day)}>
            {Number(day.slice(8))}
            {events.slice(0, 2).map((e) => <div key={e.id} className={`marker${e.done ? ' done' : ''}`}>{e.important ? '★' : '▪'} {e.title}</div>)}
            {todos.slice(0, 2).map((t) => <div key={t.id} className={`marker${t.done ? ' done' : ''}`}>{t.important ? '★' : '•'} {t.title}</div>)}
            {events.length + todos.length > 4 && <div className="marker">+{events.length + todos.length - 4}</div>}
          </div>
        )
      })}
    </div>
  )
}

function DayList(p: Handlers & { day: string; onClose: () => void }) {
  const { events, todos } = itemsOnDay(p.items, p.day)
  return (
    <div className="modal-backdrop" onClick={p.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <strong>{p.day}</strong>
        <ul>
          {[...events, ...todos].map((i) => (
            <li key={i.id} className={i.done ? 'done' : ''} onClick={() => { p.onClose(); p.onOpen(i) }}>
              <input type="checkbox" checked={i.done} onClick={(e) => e.stopPropagation()} onChange={() => p.onToggle(i)} />
              {i.title}{i.important && <span className="star"> ★</span>}
            </li>
          ))}
        </ul>
        {events.length + todos.length === 0 && <p className="muted">항목이 없습니다.</p>}
        <div className="row">
          <button className="primary" onClick={() => { p.onClose(); p.onNew({ dueDate: p.day }) }}>이 날짜에 추가</button>
          <button onClick={p.onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
