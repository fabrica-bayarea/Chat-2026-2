import { useCallback, useEffect, useState } from 'react'
import { generateId } from 'ai'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Chat } from '@/components/chat/Chat'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ThemeProvider } from '@/components/theme-provider'

export default function App() {
  const [chatId, setChatId] = useState(() => generateId())

  const startNewChat = useCallback(() => setChatId(generateId()), [])

  // Ctrl/Cmd + Shift + O → new conversation (same shortcut as ChatGPT).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'o') {
        event.preventDefault()
        startNewChat()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [startNewChat])

  return (
    <ThemeProvider>
      <TooltipProvider delay={400}>
        <SidebarProvider>
          <ChatSidebar activeId={chatId} onSelect={setChatId} onNewChat={startNewChat} />
          <SidebarInset className="h-svh min-w-0 overflow-hidden">
            {/* Keying by id remounts useChat with the selected conversation's messages. */}
            <Chat key={chatId} chatId={chatId} onNewChat={startNewChat} />
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="top-center" />
      </TooltipProvider>
    </ThemeProvider>
  )
}
