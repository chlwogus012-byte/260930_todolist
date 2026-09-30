export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="error">
      {message}
      {onRetry && <button onClick={onRetry}>다시 시도</button>}
    </div>
  )
}
