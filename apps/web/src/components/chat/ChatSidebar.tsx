import { memo, useMemo, useState } from 'react'
import { MessageSquareIcon, SquarePenIcon, Trash2Icon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { AssistantAvatar } from '@/components/chat/AssistantAvatar'
import { chatHistory, useConversations } from '@/hooks/use-chat-history'
import type { Conversation } from '@/types/chat'

type ChatSidebarProps = {
  activeId: string
  onSelect: (id: string) => void
  onNewChat: () => void
}

type Group = { label: string; items: Conversation[] }

const DAY_MS = 86_400_000

function groupByDate(conversations: Conversation[]): Group[] {
  const startOfToday = new Date().setHours(0, 0, 0, 0)
  const buckets: Group[] = [
    { label: 'Hoje', items: [] },
    { label: 'Ontem', items: [] },
    { label: 'Últimos 7 dias', items: [] },
    { label: 'Últimos 30 dias', items: [] },
    { label: 'Mais antigas', items: [] },
  ]
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)

  for (const conversation of sorted) {
    const t = conversation.updatedAt
    const index =
      t >= startOfToday
        ? 0
        : t >= startOfToday - DAY_MS
          ? 1
          : t >= startOfToday - 7 * DAY_MS
            ? 2
            : t >= startOfToday - 30 * DAY_MS
              ? 3
              : 4
    buckets[index]?.items.push(conversation)
  }
  return buckets.filter((group) => group.items.length > 0)
}

export const ChatSidebar = memo(function ChatSidebar({
  activeId,
  onSelect,
  onNewChat,
}: ChatSidebarProps) {
  const conversations = useConversations()
  const groups = useMemo(() => groupByDate(conversations), [conversations])
  const [pendingDelete, setPendingDelete] = useState<Conversation | null>(null)
  const { isMobile, setOpenMobile } = useSidebar()

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false)
  }

  const confirmDelete = () => {
    if (!pendingDelete) return
    chatHistory.remove(pendingDelete.id)
    if (pendingDelete.id === activeId) onNewChat()
    setPendingDelete(null)
  }

  return (
    <>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader className="gap-3 px-3 pt-3">
          <div className="flex items-center gap-2.5 px-1">
            <AssistantAvatar className="size-7 rounded-md [&_svg]:size-3.5" />
            <span className="text-[15px] font-semibold tracking-tight">Atlas</span>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              onNewChat()
              closeOnMobile()
            }}
            className="h-9 justify-start gap-2 bg-background px-3 shadow-xs"
          >
            <SquarePenIcon aria-hidden />
            Nova conversa
            <kbd className="ml-auto hidden font-sans text-[11px] text-muted-foreground md:inline">
                <span className="sr-only">Atalho: </span>Ctrl+Shift+O
            </kbd>
          </Button>
        </SidebarHeader>

        <SidebarContent>
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <MessageSquareIcon className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground text-pretty">
                Suas conversas aparecerão aqui.
              </p>
            </div>
          ) : (
            <nav aria-label="Histórico de conversas">
              {groups.map((group) => (
                <SidebarGroup key={group.label}>
                  <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((conversation) => {
                        const isActive = conversation.id === activeId
                        return (
                          <SidebarMenuItem key={conversation.id}>
                            <SidebarMenuButton
                              isActive={isActive}
                              aria-current={isActive ? 'page' : undefined}
                              onClick={() => {
                                onSelect(conversation.id)
                                closeOnMobile()
                              }}
                              className="h-9"
                            >
                              <span>{conversation.title}</span>
                            </SidebarMenuButton>
                            <SidebarMenuAction
                              showOnHover
                              aria-label={`Excluir conversa "${conversation.title}"`}
                              onClick={() => setPendingDelete(conversation)}
                              className="top-2! text-muted-foreground hover:text-destructive"
                            >
                              <Trash2Icon aria-hidden />
                            </SidebarMenuAction>
                          </SidebarMenuItem>
                        )
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </nav>
          )}
        </SidebarContent>

        <SidebarFooter className="px-4 pb-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Histórico salvo localmente neste navegador.
          </p>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${pendingDelete?.title ?? ''}" será removida permanentemente deste navegador.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})
