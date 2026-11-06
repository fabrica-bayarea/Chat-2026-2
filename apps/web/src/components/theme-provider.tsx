import type { ReactNode } from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      themes={['light', 'dark', 'indigo']}
      enableSystem
      disableTransitionOnChange
      storageKey="atlas.theme"
    >
      {children}
    </NextThemesProvider>
  )
}