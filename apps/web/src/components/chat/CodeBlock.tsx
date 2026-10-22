import { memo, useEffect, useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'

type CodeBlockProps = {
  code: string
  language: string
}

/** Delay before re-highlighting, so streaming tokens don't trigger work on every chunk. */
const HIGHLIGHT_DEBOUNCE_MS = 120

async function highlight(code: string, language: string): Promise<string> {
  // Shiki is loaded lazily so it stays out of the initial bundle.
  const { codeToHtml, bundledLanguages } = await import('shiki')
  const lang = language in bundledLanguages ? language : 'text'
  return codeToHtml(code, {
    lang,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: 'light',
  })
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  const [html, setHtml] = useState<string | null>(null)
  const { copied, copy } = useCopyToClipboard()

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      highlight(code, language)
        .then((result) => {
          if (!cancelled) setHtml(result)
        })
        .catch(() => {
          // Fall back to the plain <pre> render below.
        })
    }, HIGHLIGHT_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [code, language])

  return (
    <figure className="group/code my-4 overflow-hidden rounded-xl border bg-muted/40 first:mt-0 last:mb-0">
      <figcaption className="flex h-9 items-center justify-between border-b bg-muted/60 pr-1.5 pl-3.5">
        <span className="font-mono text-xs text-muted-foreground lowercase">
          {language || 'text'}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => copy(code)}
          aria-label={copied ? 'Código copiado' : 'Copiar código'}
          className="text-muted-foreground hover:text-foreground"
        >
          {copied ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </Button>
      </figcaption>

      {html ? (
        <div
          className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed [&_pre]:outline-none"
          // Shiki escapes the source code; output is safe to inject.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed">
          <code>{code}</code>
        </pre>
      )}
    </figure>
  )
})
