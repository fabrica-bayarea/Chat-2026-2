import { z } from "zod";

const schema = z.object({
  MCP_COMMAND: z.string().trim().min(1),
  MCP_ARGS: z.string().default("[]").transform((value) => JSON.parse(value)).pipe(z.array(z.string())),
  MCP_CWD: z.string().trim().min(1).optional(),
  MCP_ENV: z.string().default("{}").transform((value) => JSON.parse(value)).pipe(z.record(z.string(), z.string())),
  MCP_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
});

export function loadMcpConfig(env: NodeJS.ProcessEnv = process.env) {
  if (!env.MCP_COMMAND?.trim()) return undefined;
  try {
    const config = schema.parse(env);
    return {
      command: config.MCP_COMMAND,
      args: config.MCP_ARGS,
      cwd: config.MCP_CWD,
      env: config.MCP_ENV,
      timeoutMs: config.MCP_TIMEOUT_MS,
    };
  } catch {
    // Não imprimir valores: MCP_ENV pode conter credenciais.
    throw new Error("Configuração MCP inválida. Verifique MCP_COMMAND, MCP_ARGS, MCP_CWD, MCP_ENV e MCP_TIMEOUT_MS.");
  }
}

export type McpConfig = NonNullable<ReturnType<typeof loadMcpConfig>>;
