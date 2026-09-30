import type { Item } from '../domain/types'
import { dueLabel, effectiveDue, isOverdue, quadrant, todayList } from '../domain/rules'
import { itemsOnDay } from '../domain/calendar'
import { toLocalInput } from '../domain/dates'

const CIRCLED = ['', '①', '②', '③', '④']
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

function heading(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  return `${m}월 ${d}일 ${WEEKDAY[new Date(y, m - 1, d).getDay()]}요일`
}

export function TodayView(props: {
  items: Item[]
  today: string
  onToggle: (item: Item) => void
  onOpen: (item: Item) => void
}) {
  const { events } = itemsOnDay(props.items, props.today)
  const todos = todayList(props.items, props.today).filter((i) => !i.startAt || isOverdue(i, props.today))
  return (
    <div>
      <div className="top">{heading(props.today)}</div>
      <h2 className="page-title">오늘</h2>
      <div className="sec">일정</div>
      {events.length === 0 && <p className="muted">오늘 일정이 없습니다.</p>}
      {events.length > 0 && (
        <div className="tl">
          {events.map((e) => (
            <div key={e.id} className={`ev${e.done ? ' done' : ''}`} onClick={() => props.onOpen(e)}>
              <input type="checkbox" checked={e.done} onClick={(ev) => ev.stopPropagation()} onChange={() => props.onToggle(e)} />
              <span className="t">{toLocalInput(e.startAt).slice(11)}</span>
              <span>{e.title}{e.important && <span className="star"> ★</span>}</span>
            </div>
          ))}
        </div>
      )}
      <div className="sec">할 일 · {todos.length}</div>
      {todos.length === 0 && <p className="muted">오늘 할 일이 없습니다.</p>}
      {todos.map((t) => {
        const overdue = isOverdue(t, props.today)
        return (
          <div key={t.id} className={`todo${overdue ? ' overdue' : ''}`} onClick={() => props.onOpen(t)}>
            <input type="checkbox" checked={t.done} onClick={(ev) => ev.stopPropagation()} onChange={() => props.onToggle(t)} />
            <span>{t.title}{t.important && <span className="star"> ★</span>}</span>
            <span className="meta">
              {!overdue && <span className="badge">{CIRCLED[quadrant(t, props.today)]} </span>}
              {dueLabel(effectiveDue(t)!, props.today)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
