export function TypingIndicator() {
  return (
    <div role="status" aria-live="polite" className="flex h-7 items-center gap-2 text-muted-foreground">
      <span className="flex items-center gap-1" aria-hidden>
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="size-1.5 animate-typing-dot rounded-full bg-current"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="text-sm">Pensando…</span>
    </div>
  )
}
