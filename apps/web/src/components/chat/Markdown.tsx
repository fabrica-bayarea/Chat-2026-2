import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from '@/components/chat/CodeBlock'

const remarkPlugins = [remarkGfm]

/**
 * Element-level styles instead of a typography plugin, so every token
 * comes from the shadcn theme and stays consistent in both color schemes.
 */
const components: Components = {
  // Block code is rendered by <CodeBlock>; unwrap the default <pre>.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-([\w+-]+)/.exec(className ?? '')
    const text = String(children ?? '')
    const isBlock = Boolean(match) || text.includes('\n')

    if (isBlock) {
      return <CodeBlock code={text.replace(/\n$/, '')} language={match?.[1] ?? ''} />
    }
    return (
      <code className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    )
  },
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mt-6 mb-3 text-xl font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-6 mb-3 text-lg font-semibold tracking-tight text-balance first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-5 mb-2 text-base font-semibold text-balance first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => <h4 className="mt-4 mb-2 font-semibold first:mt-0">{children}</h4>,
  ul: ({ children }) => (
    <ul className="my-3 flex list-disc flex-col gap-1.5 pl-6 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 flex list-decimal flex-col gap-1.5 pl-6 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 pl-4 text-muted-foreground italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-border" />,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b px-3 py-2 text-left font-medium whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="border-b px-3 py-2 align-top [tr:last-child_&]:border-b-0">{children}</td>,
}

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
      {children}
    </ReactMarkdown>
  )
})
