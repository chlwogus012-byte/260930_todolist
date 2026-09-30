import { useState } from 'react'
import type { ItemInput } from '../domain/types'
import { validateItem } from '../domain/rules'
import { ErrorBanner } from './ErrorBanner'
import { fromLocalInput, toLocalInput } from '../domain/dates'

export type Draft = {
  id: string | null
  title: string
  important: boolean
  dueDate: string | null
  startAt: string | null
  endAt: string | null
}

export function ItemModal(props: {
  draft: Draft
  onSave: (input: ItemInput) => Promise<boolean>
  onDelete?: () => void
  onClose: () => void
}) {
  const { draft } = props
  const [title, setTitle] = useState(draft.title)
  const [important, setImportant] = useState(draft.important)
  const [due, setDue] = useState(draft.dueDate ?? '')
  const [start, setStart] = useState(toLocalInput(draft.startAt))
  const [end, setEnd] = useState(toLocalInput(draft.endAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (saving) return
    const input = {
      title,
      important,
      dueDate: due || null,
      startAt: fromLocalInput(start),
      endAt: fromLocalInput(end),
    }
    const invalid = validateItem(input)
    if (invalid) { setError(invalid); return }
    setError(null)
    setSaving(true)
    const ok = await props.onSave(input)
    setSaving(false)
    if (ok) props.onClose()
    else setError('저장하지 못했습니다. 다시 시도하세요.')
  }

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <input className="title-input" autoFocus placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="check"><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> 중요 ★</label>
        <label>마감일 <input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        <label>시작 <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>종료 <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        {error && <ErrorBanner message={error} />}
        <div className="row">
          <button className="primary" type="submit" disabled={saving}>저장</button>
          <button type="button" onClick={props.onClose}>취소</button>
          {props.onDelete && <button type="button" className="danger" onClick={props.onDelete}>삭제</button>}
        </div>
      </form>
    </div>
  )
}
