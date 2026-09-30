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
