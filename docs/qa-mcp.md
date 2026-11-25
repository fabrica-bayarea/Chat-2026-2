# QA da integração MCP

Primeira rodada: 05/11/2026, branch `feat/mcp-client`.
Correção das pendências: 25/11/2026, branch `fix/qa-mcp-pendencias` (a partir do `develop`, com
os commits do cliente MCP trazidos da `feat/mcp-client`).

## Resultado

As quatro pendências da primeira rodada foram resolvidas e testadas com dados fictícios.
Ainda **não** é aprovação para produção: o login usa contas fictícias em código (o cadastro real
é do EP-05) e o teste com LLM real não foi refeito nesta rodada (ver "Limites deste QA").

## Pendências da primeira rodada

### 1. Autenticar usuário e autorizar a matrícula no servidor — resolvida

Antes: `/api/chat` aceitava qualquer pessoa e a ferramenta `consultar_matricula` enviava o
número **escolhido pelo modelo**. Qualquer um podia consultar qualquer matrícula.

Agora:

- `apps/backend` tem login de aluno (`POST /api/auth/login`), conforme o EP-05: JWT HS256 em
  cookie `chat_session` **httponly**, SameSite=Lax, Secure em produção. Senha com scrypt e
  comparação em tempo constante. Mesma resposta 401 para senha errada e matrícula inexistente.
  5 falhas na mesma matrícula em 15 minutos bloqueiam (429). Sem `AUTH_JWT_SECRET` (mínimo de 32
  caracteres), o backend não sobe.
- `apps/mastra-core` pergunta ao backend (`GET /api/auth/me`), a cada mensagem, de quem é o
  cookie. Só o backend conhece o segredo do JWT. Qualquer falha conta como visitante.
- A ferramenta entregue ao agente **não recebe matrícula**: o servidor injeta a matrícula da
  sessão em cada chamada (`requestContext`). Se o modelo mandar outro número, ele é ignorado.
  Sem sessão, a ferramenta devolve "a consulta de matrícula exige login" e a API acadêmica não
  é chamada.
- Visitante continua usando o chat sem login (EP-05, US-01).

### 2. Histórico confiável no servidor — resolvida

Antes: o agente recebia o histórico enviado pelo navegador. O cliente podia forjar respostas do
assistente e resultados de ferramenta.

Agora:

- O servidor guarda a conversa (`CHAT_HISTORY_DB_URL`, LibSQL) com um dono: `visitante` ou
  `aluno:<matrícula>`.
- De cada requisição, o servidor usa só a **última mensagem do usuário**, e dela só partes de
  texto e anexo `data:`. O resto da conversa vem do banco. Mensagens de assistente, partes de
  ferramenta, `data-*` e `source-*` enviadas pelo cliente são ignoradas.
- Anexo com URL `http(s)` é descartado, porque faria o servidor baixar um endereço escolhido
  pelo cliente (SSRF).
- Conversa de aluno só continua com o mesmo aluno (403 para outro aluno ou para visitante).
  Conversa de visitante pode ser assumida pelo aluno que entra no meio dela.
- "Regenerar" troca a última resposta guardada, sem duplicar a pergunta.

### 3. Dependências — resolvida

- O `pnpm-lock.yaml` do `develop` estava **quebrado** (chave duplicada) e o `pnpm audit` nem
  rodava. Foi regenerado.
- `pnpm up -r` (sem trocar versão maior) e overrides em `pnpm-workspace.yaml` para
  dependências indiretas: `body-parser`, `qs` (express do NestJS), `undici@6` e `tmp`
  (`@nestjs/mau`, CLI de deploy).
- `shadcn` foi para `devDependencies`: é usado só no build (CSS empacotado pelo Vite).
- Resultado (`pnpm audit`, evidência em [qa-mcp-audit.json](qa-mcp-audit.json)):

| | Antes (05/11) | Depois (25/11) |
|---|---|---|
| Produção (`--prod`) | 58 (1 crítico, 23 altos) | **0** |
| Produção + desenvolvimento | — | 1 moderado |

O alerta que sobrou é o `minimatch` 10 dentro do `eslint` (só lint, em desenvolvimento). A
correção só existe na versão 11, que o eslint ainda não aceita.

### 4. Logs das bibliotecas e armazenamento persistente — resolvida

- O logger padrão do Mastra imprimia o erro inteiro do provedor ("Upstream LLM API error"),
  com o corpo da requisição (prompt e conversa) e da resposta. Agora o `SafeLogger` imprime só a
  mensagem, o nome do erro e o status HTTP, e desliga debug/info.
- O `mcp-server` deixou de escrever o número da matrícula no log.
- O Mastra agora usa armazenamento LibSQL em arquivo (`MASTRA_STORAGE_URL`), em vez de memória.

## Verificações executadas

| Pacote | Resultado |
|---|---|
| `mastra-core` | 75 testes, 15 arquivos: aprovados. TypeScript sem erros. |
| `mcp-server` | 10 testes: aprovados. TypeScript sem erros. |
| `backend` | 1 unitário + 8 e2e (7 de autenticação): aprovados. Build e lint ok. |
| `web` | 29 testes: aprovados. Build ok. Lint com os 3 erros que já existiam no `develop`. |

Testes novos que cobrem cada pendência:

- `apps/mastra-core/test/chat-flow.test.ts`: integração da rota `POST /api/chat` com servidor
  MCP real, banco real, backend falso e um modelo falso que **tenta consultar a matrícula de
  outra pessoa**. Cobre: só a matrícula da sessão chega à API; visitante não consulta; cookie
  inválido conta como visitante; histórico forjado não chega ao modelo; partes injetadas e URL
  http descartadas; regenerar; dono da conversa (403); CORS com credentials.
- `apps/mastra-core/test/mcp.test.ts`: ferramenta sem parâmetro de matrícula; número do modelo
  ignorado; visitante bloqueado.
- `apps/mastra-core/test/chat-security.test.ts`: agora confere **todos** os logs (inclusive os
  do Mastra), não só os `[chat]`.
- `apps/backend/test/auth.e2e-spec.ts`: cookie httponly, 401 igual, 400, `me`, token alterado
  ou de outro segredo, logout e bloqueio por tentativas.
- `apps/mcp-server/test/integracao.test.ts`: stderr sem o número da matrícula.

Prova de que os testes pegam a falha: com a ferramenta voltando a usar o número do modelo,
2 testes falham. Sem o `SafeLogger`, o teste de logs falha. Com o log antigo do mcp-server, o
teste de log falha.

Teste manual no navegador, com backend, mastra-core e web rodando localmente:

- Senha errada mostra a mensagem de erro.
- Login certo mostra o nome do aluno, e `document.cookie` fica vazio (o token não é legível
  pelo JavaScript).
- A sessão continua depois de recarregar a página.
- Mensagem enviada logado: o servidor gravou a conversa com dono `aluno:12345`.
- Depois de sair, continuar a mesma conversa dá 403 com mensagem amigável.
- Log do mastra-core: `[mastra] Upstream LLM API error (AI_APICallError 500)`, sem corpo.

## Limites deste QA

- **LLM real não testado nesta rodada.** O Ollama da máquina do QA está com a instalação
  quebrada (falta `llama-server.exe`). Os testes usam um modelo falso que segue o protocolo do
  Ollama. Refazer `pnpm --filter mastra-core mcp:chat-test` com o Ollama funcionando.
- Contas de aluno são fictícias e ficam em código (`apps/backend/src/auth/alunos.ts`). Cadastro,
  login administrativo e RBAC continuam no EP-05.
- O bloqueio por tentativas fica em memória: zera ao reiniciar e não vale entre várias
  instâncias do backend.
- Conversa de visitante é protegida só pelo id aleatório que o navegador gera.
- O mock `GET /api/mock/academico/matricula/:id` do backend continua aberto. Ele não é usado
  pelo MCP (que chama `API_MOCK_URL/matriculas/:id`) e não deve ir para produção.
- Conversas criadas antes desta mudança só existem no navegador. Ao continuar uma delas, o
  agente só vê a última pergunta.
- Não foi feito teste de invasão.

## Controles confirmados por inspeção (primeira rodada, ainda valem)

- SDK inicia o processo MCP com `shell: false`; configuração vem do ambiente do backend.
- Ambiente do processo filho usa a lista básica do SDK e as variáveis explícitas.
- Cliente MCP não registra argumentos, resultados ou credenciais; stderr MCP é suprimido.
- `.env` não está versionado; os arquivos versionados são `.env.example`.
- A descoberta expõe todo o catálogo do servidor configurado. Apenas administradores devem
  configurar esse servidor e aprovar mudanças no catálogo.
