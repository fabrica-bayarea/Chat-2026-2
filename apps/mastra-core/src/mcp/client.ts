import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createTool } from "@mastra/core/tools";
import type { ToolsInput } from "@mastra/core/agent";
import type { LoggedStudent } from "../auth/logged-student.js";
import { loadMcpConfig, type McpConfig } from "../config/mcp.config.js";

// Ferramentas do MCP que só podem consultar dados do aluno logado
const TOOLS_FOR_LOGGED_STUDENT = new Set(["consultar_matricula"]);

export const LOGIN_REQUIRED_MESSAGE =
  "A consulta de matrícula exige login. Peça para o aluno entrar com a conta dele e tentar de novo.";

export class McpCommunicationError extends Error {
  constructor() {
    super("Não foi possível comunicar com o servidor de ferramentas. Tente novamente em instantes.");
    this.name = "McpCommunicationError";
  }
}

export class McpToolsClient {
  private client?: Client;
  private connection?: Promise<Client>;

  constructor(private readonly config: McpConfig) {}

  private connect(): Promise<Client> {
    if (this.connection) return this.connection;
    this.connection = this.open();
    return this.connection;
  }

  private async open(): Promise<Client> {
    const client = new Client({ name: "college-orchestrator", version: "1.0.0" });
    this.client = client;
    client.onclose = () => {
      if (this.client === client) {
        this.client = undefined;
        this.connection = undefined;
      }
    };
    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args,
      cwd: this.config.cwd,
      env: this.config.env,
      stderr: "ignore",
    });
    try {
      await client.connect(transport, { timeout: this.config.timeoutMs });
      return client;
    } catch {
      await client.close().catch(() => {});
      this.connection = undefined;
      throw new McpCommunicationError();
    }
  }

  async listTools(): Promise<ToolsInput> {
    try {
      const client = await this.connect();
      const tools: ToolsInput = Object.create(null);
      let cursor: string | undefined;
      do {
        const page = await client.listTools({ cursor }, { timeout: this.config.timeoutMs });
        for (const definition of page.tools) {
          if (TOOLS_FOR_LOGGED_STUDENT.has(definition.name)) {
            tools[definition.name] = this.createLoggedStudentTool(definition.name);
            continue;
          }
          tools[definition.name] = createTool({
            id: definition.name,
            description: definition.description ?? definition.name,
            inputSchema: definition.inputSchema,
            execute: async (input, context) => {
              try {
                return await this.callTool(definition.name, input as Record<string, unknown>, context?.abortSignal);
              } catch {
                return { isError: true, content: [{ type: "text", text: new McpCommunicationError().message }] };
              }
            },
          });
        }
        cursor = page.nextCursor;
      } while (cursor);
      console.info(`[mcp-client] ${Object.keys(tools).length} ferramenta(s) descoberta(s).`);
      return tools;
    } catch {
      console.error("[mcp-client] Falha na conexão ou descoberta de ferramentas.");
      throw new McpCommunicationError();
    }
  }

  // Ferramenta que consulta dados do próprio aluno. O modelo NÃO informa a matrícula: ela vem
  // da sessão verificada pelo backend (requestContext "aluno"), a cada chamada, aqui no servidor.
  // Mesmo que o modelo invente ou receba outro número, ele é ignorado.
  private createLoggedStudentTool(name: string) {
    return createTool({
      id: name,
      description:
        "Consulta os dados de matrícula do aluno logado (nome, curso, situação). Não recebe parâmetros: usa a conta do aluno que está conversando.",
      // Sem parâmetros. Se o modelo mandar algum (ex.: um número), ele é aceito e IGNORADO:
      // recusar só deixaria um modelo pequeno preso em erro de validação.
      inputSchema: { type: "object", properties: {} },
      execute: async (_ignoredInput, context) => {
        const student = context?.requestContext?.get("aluno") as LoggedStudent | undefined;
        if (!student?.matricula) {
          return { isError: true, content: [{ type: "text", text: LOGIN_REQUIRED_MESSAGE }] };
        }
        try {
          return await this.callTool(name, { matricula: student.matricula }, context?.abortSignal);
        } catch {
          return { isError: true, content: [{ type: "text", text: new McpCommunicationError().message }] };
        }
      },
    });
  }

  async callTool(name: string, args: Record<string, unknown>, signal?: AbortSignal) {
    try {
      const client = await this.connect();
      return await client.callTool({ name, arguments: args }, undefined, { timeout: this.config.timeoutMs, signal });
    } catch {
      console.error("[mcp-client] Falha na chamada de ferramenta.");
      throw new McpCommunicationError();
    }
  }

  async close() {
    const client = await this.connection?.catch(() => undefined);
    await client?.close();
    this.client = undefined;
    this.connection = undefined;
  }
}

let sharedClient: McpToolsClient | undefined;

export async function getMcpTools(): Promise<ToolsInput> {
  const config = loadMcpConfig();
  if (!config) return {};
  sharedClient ??= new McpToolsClient(config);
  try {
    return await sharedClient.listTools();
  } catch {
    // Conversa geral continua disponível. A próxima requisição tenta descobrir novamente.
    return {};
  }
}

export async function closeMcpClient() {
  await sharedClient?.close();
  sharedClient = undefined;
}
