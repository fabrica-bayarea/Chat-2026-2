import { useCallback, useEffect, useRef, useState } from 'react'

const BOTTOM_THRESHOLD_PX = 96

/**
 * "Sticky" auto-scroll: follows new content only while the user is already
 * at (or near) the bottom. Scrolling up pauses following until the user
 * returns to the bottom or calls `scrollToBottom`.
 */
export function useAutoScroll<
  TContainer extends HTMLElement = HTMLDivElement,
  TContent extends HTMLElement = HTMLDivElement,
>() {
  const containerRef = useRef<TContainer>(null)
  const contentRef = useRef<TContent>(null)
  const stickRef = useRef(true)
  const [isAtBottom, setIsAtBottom] = useState(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current
    if (!container) return
    stickRef.current = true
    setIsAtBottom(true)
    container.scrollTo({ top: container.scrollHeight, behavior })
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight
      const atBottom = distance <= BOTTOM_THRESHOLD_PX
      stickRef.current = atBottom
      setIsAtBottom(atBottom)
    }

    // Content grows while streaming: keep pinned only if the user was at the bottom.
    const observer = new ResizeObserver(() => {
      if (stickRef.current) container.scrollTop = container.scrollHeight
    })

    container.addEventListener('scroll', handleScroll, { passive: true })
    observer.observe(content)
    container.scrollTop = container.scrollHeight

    return () => {
      container.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [])

  return { containerRef, contentRef, isAtBottom, scrollToBottom }
}
