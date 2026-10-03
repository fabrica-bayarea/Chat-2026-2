import { OrbitIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20',
        className,
      )}
    >
      <OrbitIcon className="size-4" strokeWidth={2.25} />
    </div>
  )
}
