import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import http from "node:http";
import { after, before, describe, test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { criarApiFalsa } from "./api-falsa.js";

// Sobe o servidor MCP de verdade (processo filho, stdio) e conversa com ele como um cliente MCP.
// Os logs do servidor aparecem no terminal do teste: de propósito, ajuda a depurar.
async function iniciarServidorMcp(apiUrl: string): Promise<Client> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", "tsx", "src/server.ts"],
    env: { API_MOCK_URL: apiUrl, API_MOCK_TIMEOUT_MS: "500" },
  });
  const client = new Client({ name: "teste-integracao", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

// Erro de validação pode chegar como exceção ou como resultado com isError, então tratamos os dois.
async function consultar(client: Client, argumentos: Record<string, unknown>) {
  try {
    const resposta = await client.callTool({ name: "consultar_matricula", arguments: argumentos });
    return {
      erro: resposta.isError === true,
      conteudo: JSON.stringify(resposta.content),
      estruturado: resposta.structuredContent as Record<string, any> | undefined,
    };
  } catch (erro) {
    return { erro: true, conteudo: String(erro), estruturado: undefined };
  }
}

describe("consultar_matricula", () => {
  const { server: apiFalsa, requisicoes } = criarApiFalsa();
  let cliente: Client;
  let clienteApiFora: Client;

  before(async () => {
    await new Promise<void>((ok) => apiFalsa.listen(0, "127.0.0.1", ok));
    const porta = (apiFalsa.address() as AddressInfo).port;
    cliente = await iniciarServidorMcp(`http://127.0.0.1:${porta}`);

    // "API fora do ar": abre uma porta e fecha logo, assim ninguém escuta nela
    const apiMorta = http.createServer();
    await new Promise<void>((ok) => apiMorta.listen(0, "127.0.0.1", ok));
    const portaMorta = (apiMorta.address() as AddressInfo).port;
    await new Promise<void>((ok) => apiMorta.close(() => ok()));
    clienteApiFora = await iniciarServidorMcp(`http://127.0.0.1:${portaMorta}`);
  });

  after(async () => {
    await cliente.close();
    await clienteApiFora.close();
    apiFalsa.closeAllConnections();
    apiFalsa.close();
  });

  test("aparece no catálogo, com matricula string e obrigatória", async () => {
    const { tools } = await cliente.listTools();
    const ferramenta = tools.find((t) => t.name === "consultar_matricula");

    assert.ok(ferramenta, "consultar_matricula não está no catálogo");
    assert.ok(ferramenta.inputSchema.required?.includes("matricula"));
    const propriedade = ferramenta.inputSchema.properties?.matricula as { type?: string };
    assert.equal(propriedade.type, "string");
  });

  test("matrícula existente: devolve os dados da API", async () => {
    const r = await consultar(cliente, { matricula: "12345" });

    assert.equal(r.erro, false);
    assert.equal(r.estruturado?.status, "encontrada");
    assert.equal(r.estruturado?.dados.nome, "Maria Silva");
  });

  test("matrícula inexistente: resposta normal, não é erro", async () => {
    const r = await consultar(cliente, { matricula: "99999" });

    assert.equal(r.erro, false);
    assert.equal(r.estruturado?.status, "nao_encontrada");
    assert.equal(r.estruturado?.matricula, "99999");
  });

  test("API fora do ar: erro com mensagem amigável", async () => {
    const r = await consultar(clienteApiFora, { matricula: "12345" });

    assert.equal(r.erro, true);
    assert.match(r.conteudo, /Não foi possível consultar/);
  });

  test("API responde 500: erro", async () => {
    const r = await consultar(cliente, { matricula: "erro500" });
    assert.equal(r.erro, true);
  });

  test("API responde 200 com corpo que não é JSON: erro", async () => {
    const r = await consultar(cliente, { matricula: "lixo" });
    assert.equal(r.erro, true);
  });

  test("API demora demais: timeout vira erro", async () => {
    const r = await consultar(cliente, { matricula: "lenta" });
    assert.equal(r.erro, true);
  });

  test("entrada inválida: erro, e a API NÃO recebe requisição", async () => {
    const antes = requisicoes.length;

    assert.equal((await consultar(cliente, { matricula: "" })).erro, true);
    assert.equal((await consultar(cliente, { matricula: "   " })).erro, true);
    assert.equal((await consultar(cliente, { matricula: 12345 })).erro, true);
    assert.equal((await consultar(cliente, {})).erro, true);

    assert.equal(requisicoes.length, antes);
  });

  test("matrícula com barra não vira outro caminho na URL", async () => {
    await consultar(cliente, { matricula: "a/b" });
    assert.equal(requisicoes.at(-1), "/matriculas/a%2Fb");
  });
});