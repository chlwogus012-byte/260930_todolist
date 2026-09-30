# 할일·일정 통합 관리 웹 앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 할일과 일정을 하나의 항목으로 통합하고, 오늘 화면·캘린더·매트릭스로 보여주는 반응형 PWA를 만든다.

**Architecture:** Vite + React + TypeScript SPA. 백엔드는 BaaS(Supabase 제안, Task 1에서 검증)로 인증·DB·RLS를 맡기고 직접 만드는 서버는 없다. 긴급도·사분면·정렬·캘린더 배치 규칙은 UI와 분리된 순수 함수(`src/domain`)로 두고 단위 테스트한다.

**Tech Stack:** Vite, React, TypeScript, Vitest, @supabase/supabase-js, vite-plugin-pwa (모두 Task 1에서 버전·API 검증 후 확정)

**Spec:** `docs/superpowers/specs/2026-09-30-todo-planner-design.md`

## Global Constraints

- 할일과 일정은 하나의 항목(item). 시각이 있으면 일정으로도 표시.
- 항목 필드: 제목(필수), 중요 여부(기본 아니오), 마감일(선택), 시작·종료 시각(선택), 완료 여부(기본 미완료), 소유자.
- 시작 시각이 있고 마감일이 없으면 시작 날짜를 마감일로 간주.
- 긴급도는 저장하지 않고 계산: 미완료이고 마감일이 오늘 이전·오늘·내일. 마감일 없음은 긴급 아님.
- 사분면: ① 중요·긴급, ② 중요·덜 긴급, ③ 덜 중요·긴급, ④ 나머지.
- 오늘 할 일: 미완료이고 마감일이 오늘이거나 그 이전. 정렬: 마감 지남 → ① → ② → ③ → ④, 같은 그룹 안은 마감일 빠른 순. 마감일 없는 항목은 매트릭스에만 표시.
- 날짜·시각 기준은 사용자 기기의 로컬 시간대.
- 검증: 제목 필수, 종료 시각은 시작 시각 이후.
- 화면: 하단 탭 3개(오늘/캘린더/매트릭스) + "+" 버튼. 캘린더는 주간/월간 토글. 매트릭스는 보기 전용.
- 오류: 저장·불러오기 실패 시 메시지 + 다시 시도. 인증 만료 시 로그인 화면. 오프라인 지원 없음.
- 사용자별 데이터 분리는 RLS로 강제. 사용자 A는 B의 항목을 읽거나 수정할 수 없다.
- 범위 밖: 반복 일정, 알림·푸시, 태그·프로젝트, 공유·협업, 외부 캘린더 연동, 드래그 조작, 오프라인.
- 코드를 쓰기 전 공식 문서(Context7) + WebSearch로 3개 이상 출처 교차 확인(사용자 CLAUDE.md 규칙 5). 출처가 충돌하거나 3개 미만이면 멈추고 사용자에게 묻는다.

## Review Focus

1. 자정을 넘기는 일정(23:00~01:00): 시작 날짜 칸에만 표시되고 깨지지 않는다. → Task 4
2. 마감일(날짜)이 UTC 변환으로 하루 밀리지 않는다(자정 근처, 한국 시간대). → Task 3
3. 공백만 있는 제목은 저장되지 않는다. → Task 3
4. 저장 버튼을 연타해도 항목이 중복 생성되지 않는다. → Task 7
5. 완료 처리한 항목은 오늘·매트릭스에서 사라지고 캘린더에는 흐리게 남는다. → Task 4, 8

## File Structure

```
package.json, vite.config.ts, tsconfig.json, index.html, .env.example
supabase/migrations/0001_items.sql       테이블 + RLS
src/domain/types.ts                      Item 타입
src/domain/dates.ts                      날짜 키·로컬 변환 (순수)
src/domain/rules.ts                      긴급도·사분면·오늘 목록·검증 (순수)
src/domain/calendar.ts                   주·월 격자, 날짜별 항목 배치 (순수)
src/domain/*.test.ts
src/data/supabase.ts                     클라이언트 생성
src/data/items.ts                        항목 CRUD, 행↔Item 변환
src/state/useItems.ts                    항목 상태, 오류, 재시도
src/ui/App.tsx                           로그인 게이트, 탭, 모달 상태
src/ui/Login.tsx, ErrorBanner.tsx, ItemModal.tsx
src/ui/TodayView.tsx, CalendarView.tsx, MatrixView.tsx
src/ui/styles.css
tests/rls.test.ts                        접근 제어 통합 테스트 (테스트용 Supabase 프로젝트)
```

---

### Task 1: BaaS·스택 검증 (코드 작성 전)

**Files:**
- Create: `docs/superpowers/plans/stack-verification.md`

**Interfaces:**
- Produces: 확정된 패키지 버전과 API 사용법(아래 Task들의 코드가 이와 다르면 이 기록에 맞춰 수정).

- [ ] **Step 1: Context7로 문서 조회**

`supabase-js`, `vite`, `vitest`, `vite-plugin-pwa`, React 라이브러리 ID를 resolve하고 문서를 가져온다. 확인 항목: `createClient`, `auth.signInWithPassword`/`signUp`, `auth.onAuthStateChange`, `from().select/insert/update/delete`, RLS 정책 문법(`auth.uid()`), Vite 환경변수(`import.meta.env.VITE_*`), PWA 매니페스트 설정.

- [ ] **Step 2: WebSearch로 교차 확인**

최신 버전, 호환성 문제, 무료 플랜 제한(프로젝트 일시정지 정책 등), Firebase 대비 적합성을 검색한다. Context7, 공식 사이트/저장소, WebSearch 세 출처가 일치하는지 표로 기록.

- [ ] **Step 3: 기록 작성 및 사용자 확인**

`stack-verification.md`에 확정 버전, 출처 3개 이상, 이 계획의 코드와 달라지는 점을 적는다. 출처가 충돌하거나 3개 미만이면 사용자에게 질문하고 멈춘다. Supabase가 부적합하면 사용자에게 Firebase 등 대안을 제시하고 계획을 수정한 뒤 진행한다.

---

### Task 2: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`, `src/main.tsx`, `src/ui/App.tsx`(임시)

**Interfaces:**
- Produces: `npm test`(vitest run), `npm run dev`, `npm run build`.

- [ ] **Step 1: git 저장소 초기화와 Vite 프로젝트 생성**

```bash
cd C:/Users/userpc/Desktop/11
git init
npm create vite@latest . -- --template react-ts
npm install
npm install @supabase/supabase-js
npm install -D vitest vite-plugin-pwa
```

기존 `docs/` 폴더는 유지한다. 템플릿이 덮어쓰려 하면 `docs`만 남기고 진행.

- [ ] **Step 2: 테스트 스크립트와 환경변수 파일**

`package.json`의 scripts에 `"test": "vitest run"` 추가. `.gitignore`에 `.env`, `.env.local` 추가.

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 3: 스모크 테스트**

`src/domain/smoke.test.ts`:
```ts
import { test, expect } from 'vitest'
test('runs', () => { expect(1 + 1).toBe(2) })
```
Run: `npm test` → PASS. 확인 후 이 파일 삭제.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold vite react ts project"
```

---

### Task 3: 도메인 — 타입, 날짜, 규칙 (TDD)

**Files:**
- Create: `src/domain/types.ts`, `src/domain/dates.ts`, `src/domain/rules.ts`
- Test: `src/domain/dates.test.ts`, `src/domain/rules.test.ts`

**Interfaces:**
- Produces:
  - `type Item = { id: string; title: string; important: boolean; dueDate: string | null; startAt: string | null; endAt: string | null; done: boolean }` (`dueDate`는 `YYYY-MM-DD`, `startAt`/`endAt`은 ISO 문자열)
  - `type ItemInput = Omit<Item, 'id' | 'done'> & { done?: boolean }`
  - `toDateKey(d: Date): string`, `addDays(key: string, n: number): string`
  - `toLocalInput(iso: string | null): string` (`YYYY-MM-DDTHH:mm`), `fromLocalInput(s: string): string | null`
  - `effectiveDue(item): string | null`, `isOverdue(item, today): boolean`, `isUrgent(item, today): boolean`
  - `type Quadrant = 1 | 2 | 3 | 4`, `quadrant(item, today): Quadrant`
  - `todayList(items, today): Item[]`
  - `validateItem(input: { title: string; startAt: string | null; endAt: string | null }): string | null` (오류 메시지 또는 null)

- [ ] **Step 1: 타입과 날짜 실패 테스트 작성**

`src/domain/types.ts`:
```ts
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
```

`src/domain/dates.test.ts`:
```ts
import { test, expect } from 'vitest'
import { toDateKey, addDays, toLocalInput, fromLocalInput } from './dates'

test('toDateKey uses local components, not UTC', () => {
  expect(toDateKey(new Date(2026, 8, 30, 0, 30))).toBe('2026-09-30')
  expect(toDateKey(new Date(2026, 8, 30, 23, 59))).toBe('2026-09-30')
})
test('addDays crosses month and year boundaries', () => {
  expect(addDays('2026-09-30', 1)).toBe('2026-10-01')
  expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
})
test('local input round trip', () => {
  const iso = fromLocalInput('2026-09-30T00:30')!
  expect(toLocalInput(iso)).toBe('2026-09-30T00:30')
  expect(fromLocalInput('')).toBeNull()
  expect(toLocalInput(null)).toBe('')
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- dates` → FAIL (`./dates` 없음)

- [ ] **Step 3: 구현**

`src/domain/dates.ts`:
```ts
const p = (n: number) => String(n).padStart(2, '0')

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number)
  return toDateKey(new Date(y, m - 1, d + n))
}

export function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${toDateKey(d)}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export function fromLocalInput(s: string): string | null {
  if (!s) return null
  return new Date(s).toISOString()
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- dates` → PASS

- [ ] **Step 5: 규칙 실패 테스트 작성**

`src/domain/rules.test.ts`:
```ts
import { test, expect } from 'vitest'
import type { Item } from './types'
import { effectiveDue, isOverdue, isUrgent, quadrant, todayList, validateItem } from './rules'

const T = '2026-09-30'
const mk = (o: Partial<Item> = {}): Item => ({
  id: 'x', title: 't', important: false, dueDate: null, startAt: null, endAt: null, done: false, ...o,
})

test('effectiveDue falls back to start date', () => {
  expect(effectiveDue(mk({ dueDate: '2026-10-05' }))).toBe('2026-10-05')
  expect(effectiveDue(mk({ startAt: new Date(2026, 9, 2, 9, 0).toISOString() }))).toBe('2026-10-02')
  expect(effectiveDue(mk())).toBeNull()
})

test('urgency boundaries: yesterday, today, tomorrow, day after, none', () => {
  expect(isUrgent(mk({ dueDate: '2026-09-29' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-09-30' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-10-01' }), T)).toBe(true)
  expect(isUrgent(mk({ dueDate: '2026-10-02' }), T)).toBe(false)
  expect(isUrgent(mk(), T)).toBe(false)
})

test('done items are never urgent or overdue', () => {
  expect(isUrgent(mk({ dueDate: '2026-09-29', done: true }), T)).toBe(false)
  expect(isOverdue(mk({ dueDate: '2026-09-29', done: true }), T)).toBe(false)
})

test('isOverdue only before today', () => {
  expect(isOverdue(mk({ dueDate: '2026-09-29' }), T)).toBe(true)
  expect(isOverdue(mk({ dueDate: '2026-09-30' }), T)).toBe(false)
})

test('quadrants', () => {
  expect(quadrant(mk({ important: true, dueDate: T }), T)).toBe(1)
  expect(quadrant(mk({ important: true, dueDate: '2026-12-01' }), T)).toBe(2)
  expect(quadrant(mk({ important: true }), T)).toBe(2)
  expect(quadrant(mk({ dueDate: T }), T)).toBe(3)
  expect(quadrant(mk({}), T)).toBe(4)
})

test('todayList filters and orders: overdue, Q1, Q2, Q3, Q4, then earliest due', () => {
  const items = [
    mk({ id: 'nodue', dueDate: null }),
    mk({ id: 'future', dueDate: '2026-10-09' }),
    mk({ id: 'done', dueDate: T, done: true }),
    mk({ id: 'q3', dueDate: T }),
    mk({ id: 'q1b', dueDate: '2026-09-30', important: true }),
    mk({ id: 'overdue-late', dueDate: '2026-09-29' }),
    mk({ id: 'overdue-early', dueDate: '2026-09-20', important: true }),
  ]
  expect(todayList(items, T).map((i) => i.id)).toEqual([
    'overdue-early', 'overdue-late', 'q1b', 'q3',
  ])
})

test('validateItem', () => {
  expect(validateItem({ title: '  ', startAt: null, endAt: null })).toMatch(/제목/)
  expect(validateItem({ title: '', startAt: null, endAt: null })).toMatch(/제목/)
  expect(validateItem({ title: 'a', startAt: null, endAt: null })).toBeNull()
  const s = '2026-09-30T10:00:00.000Z'
  expect(validateItem({ title: 'a', startAt: s, endAt: '2026-09-30T09:00:00.000Z' })).toMatch(/종료/)
  expect(validateItem({ title: 'a', startAt: s, endAt: s })).toBeNull()
  expect(validateItem({ title: 'a', startAt: null, endAt: s })).toMatch(/시작/)
})
```

- [ ] **Step 6: 실패 확인**

Run: `npm test -- rules` → FAIL (`./rules` 없음)

- [ ] **Step 7: 구현**

`src/domain/rules.ts`:
```ts
import type { Item } from './types'
import { addDays, toDateKey } from './dates'

export type Quadrant = 1 | 2 | 3 | 4

export function effectiveDue(item: Item): string | null {
  if (item.dueDate) return item.dueDate
  if (item.startAt) return toDateKey(new Date(item.startAt))
  return null
}

export function isOverdue(item: Item, today: string): boolean {
  const due = effectiveDue(item)
  return !item.done && due !== null && due < today
}

export function isUrgent(item: Item, today: string): boolean {
  const due = effectiveDue(item)
  return !item.done && due !== null && due <= addDays(today, 1)
}

export function quadrant(item: Item, today: string): Quadrant {
  const urgent = isUrgent(item, today)
  if (item.important) return urgent ? 1 : 2
  return urgent ? 3 : 4
}

function rank(item: Item, today: string): number {
  return isOverdue(item, today) ? 0 : quadrant(item, today)
}

export function todayList(items: Item[], today: string): Item[] {
  return items
    .filter((i) => {
      const due = effectiveDue(i)
      return !i.done && due !== null && due <= today
    })
    .sort((a, b) => {
      const r = rank(a, today) - rank(b, today)
      if (r !== 0) return r
      const d = effectiveDue(a)!.localeCompare(effectiveDue(b)!)
      if (d !== 0) return d
      return (a.startAt ?? '').localeCompare(b.startAt ?? '') || a.title.localeCompare(b.title)
    })
}

export function validateItem(v: {
  title: string
  startAt: string | null
  endAt: string | null
}): string | null {
  if (v.title.trim() === '') return '제목을 입력하세요.'
  if (v.endAt && !v.startAt) return '종료 시각에는 시작 시각이 필요합니다.'
  if (v.startAt && v.endAt && new Date(v.endAt) < new Date(v.startAt)) {
    return '종료 시각은 시작 시각 이후여야 합니다.'
  }
  return null
}
```

- [ ] **Step 8: 통과 확인**

Run: `npm test` → 모든 테스트 PASS

- [ ] **Step 9: Commit**

```bash
git add src/domain
git commit -m "feat: domain rules for urgency, quadrant, today ordering"
```

---

### Task 4: 도메인 — 캘린더 배치 (TDD)

**Files:**
- Create: `src/domain/calendar.ts`
- Test: `src/domain/calendar.test.ts`

**Interfaces:**
- Consumes: `Item`, `toDateKey`, `addDays`
- Produces:
  - `weekDays(anchor: string): string[]` (일요일 시작 7일)
  - `monthGrid(anchor: string): string[][]` (일요일 시작 주 배열, 해당 월을 포함하는 주만)
  - `itemsOnDay(items: Item[], day: string): { events: Item[]; todos: Item[] }`
    - events: `startAt`의 로컬 날짜가 day인 항목(시작 시각순). 자정을 넘겨도 시작 날짜에만.
    - todos: `startAt` 없고 `dueDate === day`인 항목.
    - 완료 항목도 포함(화면에서 흐리게 표시).

- [ ] **Step 1: 실패 테스트 작성**

`src/domain/calendar.test.ts`:
```ts
import { test, expect } from 'vitest'
import type { Item } from './types'
import { weekDays, monthGrid, itemsOnDay } from './calendar'

const mk = (o: Partial<Item>): Item => ({
  id: 'x', title: 't', important: false, dueDate: null, startAt: null, endAt: null, done: false, ...o,
})

test('weekDays starts on Sunday', () => {
  expect(weekDays('2026-09-30')).toEqual([
    '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
  ])
})

test('monthGrid covers the month in full weeks', () => {
  const g = monthGrid('2026-09-15')
  expect(g[0][0]).toBe('2026-08-30')
  expect(g[g.length - 1][6]).toBe('2026-10-03')
  expect(g.every((w) => w.length === 7)).toBe(true)
})

test('overnight event appears only on its start day', () => {
  const ev = mk({
    id: 'night',
    startAt: new Date(2026, 8, 30, 23, 0).toISOString(),
    endAt: new Date(2026, 9, 1, 1, 0).toISOString(),
  })
  expect(itemsOnDay([ev], '2026-09-30').events.map((i) => i.id)).toEqual(['night'])
  expect(itemsOnDay([ev], '2026-10-01').events).toEqual([])
})

test('events sorted by start; todos are timeless items on due date; done items kept', () => {
  const a = mk({ id: 'a', startAt: new Date(2026, 8, 30, 15, 0).toISOString() })
  const b = mk({ id: 'b', startAt: new Date(2026, 8, 30, 9, 0).toISOString(), done: true })
  const t = mk({ id: 't', dueDate: '2026-09-30' })
  const r = itemsOnDay([a, b, t], '2026-09-30')
  expect(r.events.map((i) => i.id)).toEqual(['b', 'a'])
  expect(r.todos.map((i) => i.id)).toEqual(['t'])
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- calendar` → FAIL

- [ ] **Step 3: 구현**

`src/domain/calendar.ts`:
```ts
import type { Item } from './types'
import { addDays, toDateKey } from './dates'

function dow(key: string): number {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function weekDays(anchor: string): string[] {
  const start = addDays(anchor, -dow(anchor))
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function monthGrid(anchor: string): string[][] {
  const [y, m] = anchor.split('-').map(Number)
  const first = toDateKey(new Date(y, m - 1, 1))
  const last = toDateKey(new Date(y, m, 0))
  const weeks: string[][] = []
  let cur = addDays(first, -dow(first))
  while (cur <= last) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cur, i)))
    cur = addDays(cur, 7)
  }
  return weeks
}

export function itemsOnDay(items: Item[], day: string): { events: Item[]; todos: Item[] } {
  const events = items
    .filter((i) => i.startAt && toDateKey(new Date(i.startAt)) === day)
    .sort((a, b) => a.startAt!.localeCompare(b.startAt!))
  const todos = items.filter((i) => !i.startAt && i.dueDate === day)
  return { events, todos }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test` → PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/calendar.ts src/domain/calendar.test.ts
git commit -m "feat: calendar layout helpers"
```

---

### Task 5: DB 스키마, RLS, 접근 제어 테스트

**Files:**
- Create: `supabase/migrations/0001_items.sql`, `tests/rls.test.ts`

**Interfaces:**
- Produces: 테이블 `public.items` (컬럼 `id, owner, title, important, due_date, start_at, end_at, done, created_at`), 소유자 전용 RLS.

- [ ] **Step 1: 테스트용 Supabase 프로젝트 준비 (사용자 작업)**

사용자에게 부탁: Supabase에서 프로젝트를 만들고 Authentication → 이메일 확인(confirm email)을 끄고, `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 넣게 한다. 실서비스 프로젝트와 테스트 프로젝트를 나누는 것을 권장한다. 값이 없으면 멈추고 요청한다.

- [ ] **Step 2: 마이그레이션 작성**

`supabase/migrations/0001_items.sql`:
```sql
create table public.items (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  important boolean not null default false,
  due_date date,
  start_at timestamptz,
  end_at timestamptz,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_at is null or (start_at is not null and end_at >= start_at))
);

create index items_owner_due_idx on public.items (owner, due_date);

alter table public.items enable row level security;

create policy "owner full access" on public.items
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));
```

사용자에게 Supabase SQL Editor에서 실행하도록 안내(또는 CLI가 있으면 `supabase db push`).

- [ ] **Step 3: 접근 제어 테스트 작성**

`tests/rls.test.ts`:
```ts
import { test, expect, beforeAll } from 'vitest'
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
```

- [ ] **Step 4: 실행**

Run: `npm test -- rls` → PASS. 실패하면 정책·이메일 확인 설정부터 점검한다(테스트를 약하게 고치지 않는다).

- [ ] **Step 5: Commit**

```bash
git add supabase tests
git commit -m "feat: items table with owner-only RLS and access tests"
```

---

### Task 6: 데이터 계층, 인증, 상태

**Files:**
- Create: `src/data/supabase.ts`, `src/data/items.ts`, `src/state/useItems.ts`, `src/ui/Login.tsx`, `src/ui/ErrorBanner.tsx`
- Test: `src/data/items.test.ts`

**Interfaces:**
- Consumes: `Item`, `ItemInput`, `validateItem`
- Produces:
  - `supabase: SupabaseClient`
  - `rowToItem(row): Item`, `inputToRow(input: ItemInput): Record<string, unknown>`
  - `listItems(): Promise<Item[]>`, `createItem(input: ItemInput): Promise<Item>`, `updateItem(id: string, patch: Partial<ItemInput>): Promise<Item>`, `deleteItem(id: string): Promise<void>` (실패 시 throw)
  - `useItems(): { items: Item[]; error: string | null; loading: boolean; reload(): Promise<void>; save(id: string | null, input: ItemInput): Promise<boolean>; toggleDone(item: Item): Promise<void>; remove(id: string): Promise<void>; clearError(): void }`
  - `<Login />`, `<ErrorBanner message onRetry />`

- [ ] **Step 1: 변환 함수 실패 테스트**

`src/data/items.test.ts`:
```ts
import { test, expect } from 'vitest'
import { rowToItem, inputToRow } from './items'

test('rowToItem maps snake_case to Item', () => {
  expect(rowToItem({
    id: '1', title: 'a', important: true, due_date: '2026-09-30',
    start_at: null, end_at: null, done: false,
  })).toEqual({
    id: '1', title: 'a', important: true, dueDate: '2026-09-30',
    startAt: null, endAt: null, done: false,
  })
})

test('inputToRow trims title and omits owner', () => {
  const row = inputToRow({
    title: '  a  ', important: false, dueDate: null, startAt: null, endAt: null,
  })
  expect(row.title).toBe('a')
  expect('owner' in row).toBe(false)
})
```

Run: `npm test -- items` → FAIL

- [ ] **Step 2: 구현**

`src/data/supabase.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

`src/data/items.ts`:
```ts
import type { Item, ItemInput } from '../domain/types'
import { supabase } from './supabase'

type Row = {
  id: string; title: string; important: boolean; due_date: string | null
  start_at: string | null; end_at: string | null; done: boolean
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
```

Run: `npm test -- items` → PASS

- [ ] **Step 3: 상태 훅**

`src/state/useItems.ts`:
```ts
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
```

- [ ] **Step 4: 로그인 화면과 오류 배너**

`src/ui/ErrorBanner.tsx`:
```tsx
export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error">
      {message}
      {onRetry && <button onClick={onRetry}>다시 시도</button>}
    </div>
  )
}
```

`src/ui/Login.tsx`:
```tsx
import { useState } from 'react'
import { supabase } from '../data/supabase'
import { ErrorBanner } from './ErrorBanner'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(mode: 'in' | 'up') {
    setBusy(true)
    setError(null)
    const args = { email, password }
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword(args)
      : await supabase.auth.signUp(args)
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <form className="login" onSubmit={(e) => { e.preventDefault(); void submit('in') }}>
      <h1>할일 정리</h1>
      <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      {error && <ErrorBanner message={error} />}
      <button type="submit" disabled={busy}>로그인</button>
      <button type="button" disabled={busy} onClick={() => void submit('up')}>가입</button>
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/data src/state src/ui
git commit -m "feat: data layer, items state, login"
```

---

### Task 7: 앱 셸, 항목 입력·수정 창, 오늘 화면

**Files:**
- Create: `src/ui/App.tsx`(교체), `src/ui/ItemModal.tsx`, `src/ui/TodayView.tsx`, `src/ui/styles.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `useItems`, `todayList`, `isOverdue`, `itemsOnDay`, `toDateKey`, `toLocalInput`, `fromLocalInput`, `Login`, `ErrorBanner`
- Produces:
  - `type Draft = { id: string | null; title: string; important: boolean; dueDate: string | null; startAt: string | null; endAt: string | null }`
  - `<ItemModal draft onSave(input: ItemInput): Promise<boolean> onDelete?(): void onClose() />`
  - `<TodayView items today onToggle(item) onOpen(item) />`
  - App는 `openNew(prefill?: Partial<Draft>)`, `openEdit(item)`를 각 뷰에 콜백으로 전달.

- [ ] **Step 1: 모달**

`src/ui/ItemModal.tsx`:
```tsx
import { useState } from 'react'
import type { ItemInput } from '../domain/types'
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

  async function submit() {
    if (saving) return
    setSaving(true)
    const ok = await props.onSave({
      title,
      important,
      dueDate: due || null,
      startAt: fromLocalInput(start),
      endAt: fromLocalInput(end),
    })
    setSaving(false)
    if (ok) props.onClose()
  }

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); void submit() }}>
        <input autoFocus placeholder="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label><input type="checkbox" checked={important} onChange={(e) => setImportant(e.target.checked)} /> 중요</label>
        <label>마감일 <input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
        <label>시작 <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label>종료 <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <div className="row">
          <button type="submit" disabled={saving}>저장</button>
          <button type="button" onClick={props.onClose}>취소</button>
          {props.onDelete && <button type="button" onClick={props.onDelete}>삭제</button>}
        </div>
      </form>
    </div>
  )
}
```

`saving` 플래그가 연타 중복 저장을 막는다(Review Focus 4).

- [ ] **Step 2: 오늘 화면**

`src/ui/TodayView.tsx`:
```tsx
import type { Item } from '../domain/types'
import { isOverdue, todayList } from '../domain/rules'
import { itemsOnDay } from '../domain/calendar'
import { toLocalInput } from '../domain/dates'

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
      <h2>오늘 일정</h2>
      {events.length === 0 && <p className="muted">오늘 일정이 없습니다.</p>}
      <ul>
        {events.map((e) => (
          <li key={e.id} className={e.done ? 'done' : ''} onClick={() => props.onOpen(e)}>
            <input type="checkbox" checked={e.done} onClick={(ev) => ev.stopPropagation()} onChange={() => props.onToggle(e)} />
            <span className="time">{toLocalInput(e.startAt).slice(11)}</span> {e.title}
            {e.important && ' ★'}
          </li>
        ))}
      </ul>
      <h2>오늘 할 일</h2>
      {todos.length === 0 && <p className="muted">오늘 할 일이 없습니다.</p>}
      <ul>
        {todos.map((t) => (
          <li key={t.id} className={isOverdue(t, props.today) ? 'overdue' : ''} onClick={() => props.onOpen(t)}>
            <input type="checkbox" checked={t.done} onClick={(ev) => ev.stopPropagation()} onChange={() => props.onToggle(t)} />
            {t.title}{t.important && ' ★'}
            <span className="muted"> {t.dueDate}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

일정(시각 있는 항목)은 위쪽 타임라인이 맡고, 아래 할일 목록에는 시각 없는 항목과 마감이 지난 일정을 넣는다.

- [ ] **Step 3: 앱 셸**

`src/ui/App.tsx`:
```tsx
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
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />
  return <Main />
}

function Main() {
  const { items, error, reload, save, toggleDone, remove, clearError } = useItems()
  const [tab, setTab] = useState<Tab>('today')
  const [draft, setDraft] = useState<Draft | null>(null)
  const today = toDateKey(new Date())

  const openNew = (prefill: Partial<Draft> = {}) => setDraft({ ...blank, ...prefill })
  const openEdit = (i: Item) => setDraft({ id: i.id, title: i.title, important: i.important, dueDate: i.dueDate, startAt: i.startAt, endAt: i.endAt })

  return (
    <div className="app">
      {error && <ErrorBanner message={error} onRetry={() => { clearError(); void reload() }} />}
      <main>
        {tab === 'today' && <TodayView items={items} today={today} onToggle={toggleDone} onOpen={openEdit} />}
        {tab === 'calendar' && <CalendarView items={items} today={today} onOpen={openEdit} onNew={openNew} onToggle={toggleDone} />}
        {tab === 'matrix' && <MatrixView items={items} today={today} onOpen={openEdit} />}
      </main>
      <nav>
        <button onClick={() => setTab('today')}>오늘</button>
        <button onClick={() => setTab('calendar')}>캘린더</button>
        <button onClick={() => setTab('matrix')}>매트릭스</button>
        <button className="add" onClick={() => openNew({ dueDate: tab === 'today' ? today : null })}>＋</button>
        <button onClick={() => void supabase.auth.signOut()}>로그아웃</button>
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
```

인증이 만료되면 `onAuthStateChange`가 `null` 세션을 주어 로그인 화면으로 돌아간다.

- [ ] **Step 4: 진입점과 기본 스타일**

`src/main.tsx`에서 `App`을 `./ui/App`에서 import 하도록 수정. `src/ui/styles.css`:
```css
body { margin: 0; font-family: system-ui, sans-serif; }
.app { max-width: 900px; margin: 0 auto; padding: 12px 12px 72px; }
nav { position: fixed; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; background: #fff; border-top: 1px solid #ddd; padding: 8px; }
nav .add { font-size: 1.4rem; }
ul { list-style: none; padding: 0; }
li { padding: 8px 0; border-bottom: 1px solid #eee; cursor: pointer; }
li.done { opacity: .5; text-decoration: line-through; }
li.overdue { color: #b00020; font-weight: 600; }
.muted { color: #888; }
.error { background: #fde8e8; padding: 8px; margin-bottom: 8px; }
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; }
.modal { background: #fff; padding: 16px; display: grid; gap: 8px; width: min(420px, 92vw); }
.row { display: flex; gap: 8px; }
.login { display: grid; gap: 8px; max-width: 320px; margin: 20vh auto; }
.matrix { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.matrix section { border: 1px solid #ddd; padding: 8px; min-height: 120px; }
.cal-head { display: flex; gap: 8px; align-items: center; }
.month { display: grid; grid-template-columns: repeat(7, 1fr); }
.cell { border: 1px solid #eee; min-height: 72px; padding: 2px; font-size: .8rem; cursor: pointer; }
.cell.today { background: #eef4ff; }
.cell.other { color: #bbb; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); }
.daycol { position: relative; height: 960px; border-left: 1px solid #eee; }
.block { position: absolute; left: 2px; right: 2px; background: #cfe0ff; border-radius: 4px; font-size: .75rem; overflow: hidden; }
.block.important { background: #ffd6a5; }
.block.done { opacity: .4; }
.marker { font-size: .7rem; }
.marker.done { opacity: .4; text-decoration: line-through; }
```

- [ ] **Step 5: 빌드로 타입 확인 (Task 8, 9 뷰가 없으므로 임시 스텁)**

`CalendarView.tsx`, `MatrixView.tsx`가 아직 없으므로 이 Task에서는 각각 `export function X(_: any) { return null }` 스텁을 만들어 `npm run build`가 통과하는지 확인한다. 스텁은 다음 Task에서 교체된다.

Run: `npm run build` → 성공

- [ ] **Step 6: 수동 확인**

`.env`를 채우고 `npm run dev`. 가입 → 로그인 → "＋"로 제목만 입력해 저장 → 오늘 화면(마감일 오늘 자동 채움)에 표시 → 체크하면 사라짐. 저장 버튼 연타 시 항목이 하나만 생기는지 확인. 제목이 공백이면 오류 메시지가 뜨는지 확인. 네트워크를 끊고 저장하면 오류와 재시도가 뜨는지 확인.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: app shell, item modal, today view"
```

---

### Task 8: 캘린더 화면

**Files:**
- Create: `src/ui/CalendarView.tsx` (스텁 교체)

**Interfaces:**
- Consumes: `weekDays`, `monthGrid`, `itemsOnDay`, `addDays`, `toDateKey`, `Draft`
- Produces: `<CalendarView items today onOpen(item) onNew(prefill: Partial<Draft>) onToggle(item) />`

- [ ] **Step 1: 구현**

`src/ui/CalendarView.tsx`:
```tsx
import { useState } from 'react'
import type { Item } from '../domain/types'
import type { Draft } from './ItemModal'
import { addDays, toDateKey, fromLocalInput } from '../domain/dates'
import { itemsOnDay, monthGrid, weekDays } from '../domain/calendar'

const HOUR_PX = 40

export function CalendarView(props: {
  items: Item[]
  today: string
  onOpen: (i: Item) => void
  onNew: (p: Partial<Draft>) => void
  onToggle: (i: Item) => void
}) {
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
        <button onClick={() => shift(-1)}>◀</button>
        <strong>{anchor.slice(0, 7)}</strong>
        <button onClick={() => shift(1)}>▶</button>
        <button onClick={() => setAnchor(props.today)}>오늘</button>
        <button onClick={() => setMode(mode === 'week' ? 'month' : 'week')}>{mode === 'week' ? '월간' : '주간'}</button>
      </div>
      {mode === 'week' ? <Week {...props} anchor={anchor} /> : <Month {...props} anchor={anchor} onDay={setDayList} />}
      {dayList && <DayList {...props} day={dayList} onClose={() => setDayList(null)} />}
    </div>
  )
}

function Week(p: { items: Item[]; today: string; anchor: string; onOpen: (i: Item) => void; onNew: (d: Partial<Draft>) => void }) {
  return (
    <div className="week">
      {weekDays(p.anchor).map((day) => {
        const { events, todos } = itemsOnDay(p.items, day)
        return (
          <div key={day}>
            <div className={day === p.today ? 'cell today' : 'cell'}>
              {day.slice(8)}
              {todos.map((t) => (
                <div key={t.id} className={`marker${t.done ? ' done' : ''}`} onClick={() => p.onOpen(t)}>{t.important ? '★' : '•'} {t.title}</div>
              ))}
            </div>
            <div
              className="daycol"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const hour = Math.max(0, Math.min(23, Math.floor((e.clientY - rect.top) / HOUR_PX)))
                const start = fromLocalInput(`${day}T${String(hour).padStart(2, '0')}:00`)
                const end = fromLocalInput(`${day}T${String(Math.min(hour + 1, 23)).padStart(2, '0')}:${hour === 23 ? '59' : '00'}`)
                p.onNew({ dueDate: day, startAt: start, endAt: end })
              }}
            >
              {events.map((ev) => {
                const s = new Date(ev.startAt!)
                const e = ev.endAt ? new Date(ev.endAt) : null
                const startMin = s.getHours() * 60 + s.getMinutes()
                const sameDay = e && toDateKey(e) === day
                const endMin = sameDay ? e!.getHours() * 60 + e!.getMinutes() : sameDay === null ? startMin + 60 : 24 * 60
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

function Month(p: { items: Item[]; today: string; anchor: string; onDay: (d: string) => void }) {
  const month = p.anchor.slice(0, 7)
  return (
    <div className="month">
      {monthGrid(p.anchor).flat().map((day) => {
        const { events, todos } = itemsOnDay(p.items, day)
        const cls = `cell${day === p.today ? ' today' : ''}${day.startsWith(month) ? '' : ' other'}`
        return (
          <div key={day} className={cls} onClick={() => p.onDay(day)}>
            {day.slice(8)}
            {events.slice(0, 2).map((e) => <div key={e.id} className={`marker${e.done ? ' done' : ''}`}>{e.important ? '★' : '▪'} {e.title}</div>)}
            {todos.slice(0, 2).map((t) => <div key={t.id} className={`marker${t.done ? ' done' : ''}`}>{t.important ? '★' : '•'} {t.title}</div>)}
            {events.length + todos.length > 4 && <div className="marker">+{events.length + todos.length - 4}</div>}
          </div>
        )
      })}
    </div>
  )
}

function DayList(p: { items: Item[]; day: string; onOpen: (i: Item) => void; onNew: (d: Partial<Draft>) => void; onToggle: (i: Item) => void; onClose: () => void }) {
  const { events, todos } = itemsOnDay(p.items, p.day)
  return (
    <div className="modal-backdrop" onClick={p.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <strong>{p.day}</strong>
        <ul>
          {[...events, ...todos].map((i) => (
            <li key={i.id} className={i.done ? 'done' : ''} onClick={() => { p.onClose(); p.onOpen(i) }}>
              <input type="checkbox" checked={i.done} onClick={(e) => e.stopPropagation()} onChange={() => p.onToggle(i)} />
              {i.title}{i.important && ' ★'}
            </li>
          ))}
        </ul>
        {events.length + todos.length === 0 && <p className="muted">항목이 없습니다.</p>}
        <div className="row">
          <button onClick={() => { p.onClose(); p.onNew({ dueDate: p.day }) }}>이 날짜에 추가</button>
          <button onClick={p.onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
```

종료 시각이 없는 일정은 1시간 길이로 그리고, 자정을 넘기는 일정은 시작 날짜의 24:00까지만 그린다(Review Focus 1).

- [ ] **Step 2: 빌드**

Run: `npm run build` → 성공

- [ ] **Step 3: 수동 확인**

주간: 일정이 시간 위치에 블록으로 나오고, 시각 없는 할일은 날짜 머리 아래 작은 표시로 나온다. 빈 시간대 클릭 시 모달에 날짜·시작·종료가 채워진다. 월간: 날짜 클릭 시 그날 목록이 뜬다. 23:00~01:00 일정이 시작 날짜에만 나오고 깨지지 않는다. 완료한 항목이 흐리게 남는다.

- [ ] **Step 4: Commit**

```bash
git add src/ui/CalendarView.tsx
git commit -m "feat: calendar view with week and month modes"
```

---

### Task 9: 매트릭스 화면

**Files:**
- Create: `src/ui/MatrixView.tsx` (스텁 교체)

**Interfaces:**
- Consumes: `quadrant`, `Item`
- Produces: `<MatrixView items today onOpen(item) />`

- [ ] **Step 1: 구현**

`src/ui/MatrixView.tsx`:
```tsx
import type { Item } from '../domain/types'
import { quadrant, type Quadrant } from '../domain/rules'

const LABELS: Record<Quadrant, string> = {
  1: '① 중요·긴급',
  2: '② 중요·덜 긴급',
  3: '③ 덜 중요·긴급',
  4: '④ 나머지',
}

export function MatrixView(props: { items: Item[]; today: string; onOpen: (i: Item) => void }) {
  const open = props.items.filter((i) => !i.done)
  return (
    <div className="matrix">
      {([1, 2, 3, 4] as Quadrant[]).map((q) => (
        <section key={q}>
          <h3>{LABELS[q]}</h3>
          <ul>
            {open.filter((i) => quadrant(i, props.today) === q).map((i) => (
              <li key={i.id} onClick={() => props.onOpen(i)}>{i.title}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: 빌드와 전체 테스트**

Run: `npm run build && npm test` → 성공, 전 테스트 PASS(접근 제어 테스트는 `.env` 필요)

- [ ] **Step 3: 수동 확인**

마감일 없는 항목이 ④(중요면 ②)에 나오는지, 마감 내일·중요 항목이 ①, 완료 시 사라지는지 확인(Review Focus 5).

- [ ] **Step 4: Commit**

```bash
git add src/ui/MatrixView.tsx
git commit -m "feat: eisenhower matrix view"
```

---

### Task 10: PWA와 배포, 전체 흐름 확인

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/icon-192.png`, `public/icon-512.png`

**Interfaces:**
- Produces: 홈 화면에 추가 가능한 PWA 빌드, 배포 URL.

- [ ] **Step 1: PWA 설정 (Task 1에서 검증한 API 사용)**

`vite.config.ts`에 `vite-plugin-pwa`를 추가하고 매니페스트를 설정한다: `name: '할일 정리'`, `short_name: '할일'`, `display: 'standalone'`, `start_url: '/'`, 192·512 아이콘. 오프라인 캐시는 앱 셸만 하고 데이터 요청은 캐시하지 않는다(오프라인 지원은 범위 밖).

- [ ] **Step 2: 빌드와 프리뷰**

Run: `npm run build && npm run preview` → 브라우저에서 설치 가능 표시(Lighthouse 또는 주소창 설치 아이콘) 확인.

- [ ] **Step 3: 배포**

정적 호스팅(Vercel, Netlify, Cloudflare Pages 중 사용자가 선택)에 배포하고 환경변수 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정한다. 외부 서비스 생성은 사용자에게 확인한 뒤 진행한다. Supabase Authentication의 Site URL에 배포 주소를 등록한다.

- [ ] **Step 4: 전체 흐름 수동 확인 (폰 + PC)**

두 계정으로 가입해 각자 항목을 추가하고 서로의 항목이 보이지 않는지 확인. 폰에서 홈 화면에 추가 후 항목 추가 → 오늘·캘린더·매트릭스 반영 → 완료. 로그아웃 상태에서 로그인 화면이 나오는지 확인.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pwa manifest and deployment config"
```

---

## Self-Review 결과

- **스펙 커버리지:** 데이터 모델·규칙(Task 3), 캘린더 주·월(Task 4, 8), 오늘·모달(Task 7), 매트릭스(Task 9), RLS·접근 제어 테스트(Task 5), 오류 처리·인증 만료(Task 6, 7), PWA·배포(Task 10), BaaS 검증(Task 1). 누락 없음.
- **스펙 보완:** 스펙 40행 "오늘 이전"을 "오늘이거나 그 이전"으로 수정(오늘 마감 항목이 빠지는 모순 제거). 스펙에 없던 항목 삭제 기능을 모달에 넣었다(할일 앱에 필수라고 판단; 원치 않으면 Task 6·7에서 `deleteItem`, `remove`, 삭제 버튼을 빼면 된다).
- **타입 일관성:** `Item`, `ItemInput`, `Draft`, `Quadrant`와 함수 시그니처는 Task 간 동일.
