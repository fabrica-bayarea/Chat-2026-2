import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'

type WebHandler = (request: Request) => Response | Promise<Response>
type RequestContext = { headers: IncomingMessage['headers'] }

/**
 * Mirrors Vercel's per-request context so libraries such as `@vercel/oidc`
 * (used by the AI Gateway) can read request headers like `x-vercel-oidc-token`.
 */
const requestContext = new AsyncLocalStorage<RequestContext>()
const REQUEST_CONTEXT_SYMBOL = Symbol.for('@vercel/request-context')
const contextHost = globalThis as Record<symbol, unknown>
contextHost[REQUEST_CONTEXT_SYMBOL] ??= { get: () => requestContext.getStore() }

/**
 * Serves files in `/api` during local development using the same Web
 * `Request -> Response` signature that Vercel Functions use in production.
 * `api/chat.ts` therefore runs unchanged both locally and when deployed.
 */
function apiRoutes(): Plugin {
  return {
    name: 'dev-api-routes',
    configureServer(server) {
      server.middlewares.use('/api', (req, res, next) => {
        requestContext
          .run({ headers: req.headers }, () => handleApiRequest(server, req, res))
          .catch(next)
      })
    },
  }
}

async function handleApiRequest(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
) {
  const routeName = ((req.url ?? '/').split('?')[0] ?? '').replace(/^\/+|\/+$/g, '')
  const mod = (await server.ssrLoadModule(`/api/${routeName}.ts`)) as Record<
    string,
    WebHandler | undefined
  >
  const handler = mod[req.method ?? 'GET']

  if (!handler) {
    res.statusCode = 405
    res.end('Method Not Allowed')
    return
  }

  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) controller.abort()
  })

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  const originalUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url
  const request = new Request(`http://${req.headers.host}${originalUrl}`, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    signal: controller.signal,
    // Required by Node's fetch implementation when streaming a request body.
    ...(hasBody ? { duplex: 'half' } : {}),
  })

  const response = await handler(request)
  res.writeHead(response.status, Object.fromEntries(response.headers))

  if (!response.body) {
    res.end()
    return
  }

  const reader = response.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  } catch {
    // Client disconnected mid-stream (e.g. pressed "stop").
  }
  res.end()
}

export default defineConfig(({ mode }) => {
  // Expose `.env*` values (e.g. AI_GATEWAY_API_KEY) to server-side API code.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [react(), tailwindcss(), apiRoutes()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
  }
})
