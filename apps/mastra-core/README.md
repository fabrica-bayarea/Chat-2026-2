# Orquestrador (`apps/mastra-core`)

O agente Mastra usa Ollama e descobre ferramentas do MCP Server via stdio.
O SDK MCP faz o handshake, lista o catálogo e envia `tools/call`. O adaptador
em `src/mcp/client.ts` entrega as ferramentas ao agente com o JSON Schema
publicado pelo servidor. Não conhece a API acadêmica nem implementa matrícula.
A mesma configuração de ferramentas atende `generate` e o chat por streaming.

## Executar localmente

Na raiz do repositório:

```sh
pnpm install
pnpm --filter mcp-server api-falsa
```

Em outro terminal, copie `apps/mastra-core/.env.example` para
`apps/mastra-core/.env`. Mantenha as variáveis MCP do exemplo para usar a API
falsa na porta 4000. O cliente inicia o MCP Server automaticamente; não é
necessário iniciar esse processo em um terceiro terminal.

```sh
pnpm --filter mastra-core mcp:test 12345
```

Esse comando não precisa do Ollama. Deve listar `consultar_matricula` e imprimir
`structuredContent.status: encontrada` com os dados de Maria Silva. Use `99999`
para matrícula inexistente. Pare a API falsa e repita para conferir `isError`.

Para conversar pelo agente, configure `LLM_MODEL` com um modelo local que suporte
chamada de ferramentas, inicie Ollama e execute:

```sh
pnpm --filter mastra-core dev
```

No chat, envie `Consulte minha matrícula 12345`. O agente deve chamar a ferramenta
e usar o resultado para responder. Sem o número, deve pedir a matrícula.

## Configuração

| Variável | Uso |
| --- | --- |
| `MCP_COMMAND` | Executável do servidor. Ausente ou vazio desativa ferramentas. |
| `MCP_ARGS` | Array JSON de argumentos, sem shell intermediário. Padrão `[]`. |
| `MCP_CWD` | Diretório de trabalho opcional do processo filho. |
| `MCP_ENV` | Objeto JSON de variáveis passadas ao servidor. Padrão `{}`. |
| `MCP_TIMEOUT_MS` | Limite por handshake, descoberta ou chamada. Padrão 5000 ms. |

Caminhos relativos são resolvidos a partir do diretório do pacote quando iniciado
pelos scripts acima. Para outro diretório de execução, use caminhos absolutos.
Credenciais ficam no ambiente local, nunca no código ou em arquivos versionados.
O SDK herda apenas seu ambiente básico de execução; variáveis adicionais do
servidor devem ser passadas explicitamente por `MCP_ENV`. O stderr do processo
filho não é repassado, pois pode conter dados de matrícula ou URLs internas.

O cliente compartilha uma conexão, descobre ferramentas a cada requisição e
reconecta após fechamento. Falha de descoberta deixa a conversa sem ferramentas;
a próxima requisição tenta novamente. Falhas de chamada viram resultado `isError`
para o agente. Resultados MCP (inclusive `content`, `structuredContent` e `isError`)
são preservados. Não há repetição automática de chamadas de ferramenta.
SIGINT/SIGTERM fecham o cliente e seu processo filho.

## Verificação

```sh
pnpm --filter mastra-core test
pnpm --filter mastra-core check-types
```

Os testes iniciam o MCP Server real e uma API HTTP efêmera. Cobrem descoberta,
execução pelo adaptador do agente, schema inválido, matrícula ausente, falha da
API, timeout, falha de inicialização, reconexão e configuração. Não exigem `.env`
nem LLM. A integração com a escolha de ferramenta pelo modelo depende do modelo
configurado e pode ser conferida no chat.
