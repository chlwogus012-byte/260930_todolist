import type { Item } from '../domain/types'
import { quadrant, type Quadrant } from '../domain/rules'

const LABELS: Record<Quadrant, [string, string]> = {
  1: ['① 바로 하기', '중요 · 긴급'],
  2: ['② 계획하기', '중요 · 덜 긴급'],
  3: ['③ 빨리 처리', '덜 중요 · 긴급'],
  4: ['④ 나중에', '나머지'],
}

export function MatrixView(props: { items: Item[]; today: string; onOpen: (i: Item) => void }) {
  const open = props.items.filter((i) => !i.done)
  return (
    <div>
      <div className="top">미완료 항목 전체</div>
      <h2 className="page-title">매트릭스</h2>
      <div className="matrix">
        {([1, 2, 3, 4] as Quadrant[]).map((q) => (
          <section key={q} className={`q q${q}`}>
            <h3>{LABELS[q][0]}<small>{LABELS[q][1]}</small></h3>
            {open.filter((i) => quadrant(i, props.today) === q).map((i) => (
              <div key={i.id} className="it" onClick={() => props.onOpen(i)}>{i.title}</div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
