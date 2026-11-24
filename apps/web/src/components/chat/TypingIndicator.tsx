export function TypingIndicator() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex h-10 w-fit items-center gap-2 rounded-3xl rounded-bl-lg bg-secondary px-4 text-primary"
    >
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-typing-dot rounded-full bg-current"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="text-sm">digitando…</span>
    </div>
  )
}