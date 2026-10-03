import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

/** next-themes is framework-agnostic and works in Vite; it toggles the `.dark` class on <html>. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      storageKey="atlas.theme"
    >
      {children}
    </NextThemesProvider>
  )
}
