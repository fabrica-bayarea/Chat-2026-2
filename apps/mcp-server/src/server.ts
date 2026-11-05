import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};

// ---------- configuração: falhar cedo e alto ----------

const apiMockUrl = process.env.API_MOCK_URL?.replace(/\/+$/, "");
const apiMockTimeoutMs = Number(process.env.API_MOCK_TIMEOUT_MS ?? 5000);

if (!apiMockUrl) {
  console.error("[mcp] API_MOCK_URL não definida. Copie .env.example para .env e preencha.");
  process.exit(1);
}
try {
  new URL(apiMockUrl);
} catch {
  console.error(`[mcp] API_MOCK_URL inválida: ${apiMockUrl}`);
  process.exit(1);
}
if (!Number.isInteger(apiMockTimeoutMs) || apiMockTimeoutMs <= 0) {
  console.error("[mcp] API_MOCK_TIMEOUT_MS inválida: use um número inteiro positivo (ms).");
  process.exit(1);
}

// ---------- chamada à API Mock ----------

type ResultadoApi =
  | { tipo: "encontrada"; dados: unknown }
  | { tipo: "nao_encontrada" }
  | { tipo: "falha"; motivo: string };

async function buscarMatriculaNaApi(matricula: string): Promise<ResultadoApi> {
  // encodeURIComponent: "a/b" ou "../x" não podem virar outro caminho na URL
  const url = `${apiMockUrl}/matriculas/${encodeURIComponent(matricula)}`;
  console.error(`[mcp] GET ${url}`);

  let resposta: Response;
  try {
    resposta = await fetch(url, { signal: AbortSignal.timeout(apiMockTimeoutMs) });
  } catch (erro) {
    return { tipo: "falha", motivo: `erro de rede ou timeout: ${String(erro)}` };
  }

  if (resposta.status === 404) {
    return { tipo: "nao_encontrada" };
  }
  if (!resposta.ok) {
    return { tipo: "falha", motivo: `API respondeu status ${resposta.status}` };
  }

  try {
    return { tipo: "encontrada", dados: await resposta.json() };
  } catch {
    return { tipo: "falha", motivo: "API respondeu 200, mas o corpo não é JSON válido" };
  }
}

// ---------- servidor MCP ----------

const server = new McpServer({ name: "mcp-server-iesb", version: "1.0.0" });

// Log SEMPRE no stderr. Stdout é só do protocolo MCP.
server.registerTool(
  "consultar_matricula",
  {
    title: "Consultar matrícula",
    description: "Consulta os dados de uma matrícula de aluno pelo número da matrícula.",
    inputSchema: {
      matricula: z
        .string()
        .trim()
        .min(1, "matricula não pode ser vazia")
        .describe("Número da matrícula do aluno"),
    },
  },
  async ({ matricula }) => {
    console.error(`[mcp] consultar_matricula chamada (matricula=${matricula})`);

    const resposta = await buscarMatriculaNaApi(matricula);

    if (resposta.tipo === "falha") {
      console.error(`[mcp] falha ao consultar a API Mock: ${resposta.motivo}`);
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: "Não foi possível consultar a API de matrículas agora. Tente novamente em instantes.",
          },
        ],
      };
    }

    const resultado =
      resposta.tipo === "encontrada"
        ? { status: "encontrada", dados: resposta.dados }
        : { status: "nao_encontrada", matricula };

    return {
      content: [{ type: "text", text: JSON.stringify(resultado) }],
      structuredContent: resultado,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[mcp] servidor pronto (stdio), API Mock em ${apiMockUrl}`);
}

main().catch((error) => {
  console.error("[mcp] falha ao iniciar:", error);
  process.exit(1);
});