import { memo } from 'react'
import { SquarePenIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/theme-toggle'

type ChatHeaderProps = {
  title?: string
  onNewChat: () => void
}

export const ChatHeader = memo(function ChatHeader({ title, onNewChat }: ChatHeaderProps) {
  const { state, isMobile } = useSidebar()
  const showNewChat = isMobile || state === 'collapsed'

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-transparent bg-background/80 px-3 backdrop-blur-md supports-backdrop-filter:bg-background/60 sm:px-4">
      <Tooltip>
        <TooltipTrigger render={<SidebarTrigger className="text-muted-foreground" />} />
        <TooltipContent>Alternar barra lateral</TooltipContent>
      </Tooltip>

      {showNewChat ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onNewChat}
                aria-label="Nova conversa"
                className="text-muted-foreground"
              />
            }
          >
            <SquarePenIcon aria-hidden />
          </TooltipTrigger>
          <TooltipContent>Nova conversa</TooltipContent>
        </Tooltip>
      ) : null}

      <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-medium">
        {title ?? <span className="text-muted-foreground">Nova conversa</span>}
      </h2>

      <ThemeToggle />
    </header>
  )
})
