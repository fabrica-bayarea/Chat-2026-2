import iesbLogo from '@/assets/iesb-logo.png'
import { cn } from '@/lib/utils'

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-border',
        className,
      )}
    >
      <img src={iesbLogo} alt="" className="size-3/5 object-contain" />
    </div>
  )
}