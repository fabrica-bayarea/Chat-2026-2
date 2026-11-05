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
`apps/mastra-core/.env` caso o arquivo ainda não exista. Se já existir, acrescente
as variáveis MCP sem sobrescrever suas configurações. Use os valores MCP do exemplo para usar a API
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

| Variável         | Uso                                                             |
| ---------------- | --------------------------------------------------------------- |
| `MCP_COMMAND`    | Executável do servidor. Ausente ou vazio desativa ferramentas.  |
| `MCP_ARGS`       | Array JSON de argumentos, sem shell intermediário. Padrão `[]`. |
| `MCP_CWD`        | Diretório de trabalho opcional do processo filho.               |
| `MCP_ENV`        | Objeto JSON de variáveis passadas ao servidor. Padrão `{}`.     |
| `MCP_TIMEOUT_MS` | Limite por handshake, descoberta ou chamada. Padrão 5000 ms.    |

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

## Limites de segurança

Esta integração foi validada com dados fictícios. O endpoint de chat ainda não
autentica usuários nem verifica se a matrícula pertence ao solicitante. Antes
de conectar dados acadêmicos reais, implemente autenticação e autorização no
servidor para cada consulta. CORS e instruções do modelo não substituem essas
verificações. O histórico enviado pelo navegador também não é fonte confiável
de identidade ou de resultados anteriores de ferramentas.

`MCP_COMMAND`, argumentos e ambiente são configuração administrativa: o processo
MCP executa com as permissões do backend. Configure apenas servidores confiáveis;
não aceite esses valores do chat. A descoberta disponibiliza todas as ferramentas
publicadas pelo servidor configurado; revise o catálogo antes de expandi-lo.

Veja [o relatório de QA](../../docs/qa-mcp.md) para os achados de segurança e
o resultado da auditoria de dependências. Os testes funcionais não representam
aprovação de segurança para produção.

## Verificação

```sh
pnpm --filter mastra-core test
pnpm --filter mastra-core check-types
```

Os testes iniciam o MCP Server real e uma API HTTP efêmera. Cobrem descoberta,
execução pelo adaptador do agente, schema inválido, matrícula ausente, falha da
API, timeout, falha de inicialização, reconexão e configuração. Não exigem `.env`
nem LLM. A suíte também inclui um teste de regressão que verifica a sanitização
do log do chat e da resposta quando o provedor retorna erro com conteúdo sensível.

Para verificar também a escolha e execução da ferramenta pelo LLM real:

```sh
pnpm --filter mastra-core mcp:chat-test
```

Esse teste requer Ollama ativo e `LLM_MODEL` configurado no `.env`. Inicia uma
API acadêmica fictícia em porta livre e o MCP Server automaticamente. Verifica
que o modelo consultou a matrícula 12345 e respondeu com Maria e situação ativa, tanto em
`generate` quanto no streaming usado pelo chat. Também verifica que o resultado
da ferramenta chegou ao stream sem evento de erro. Não precisa iniciar a API
falsa manualmente para esse comando.

As variáveis MCP são substituídas apenas no processo do teste, sem alterar o
`.env`. O limite de geração nesse teste é de 120 segundos para permitir o
carregamento do modelo local; o limite do aplicativo continua configurável por
`LLM_TIMEOUT_MS`. O teste falha se o modelo não chamar a ferramenta ou não usar
o resultado. Servidor de teste e cliente MCP são fechados ao terminar.

Validado em 05/11/2026 com Ollama e `llama3.2:3b`: consulta real pelo modelo
aprovada em `generate` e streaming; 9 testes de integração aprovados e
`check-types` sem erros. Os dados acadêmicos usados são fictícios.
