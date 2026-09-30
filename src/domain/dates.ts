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
