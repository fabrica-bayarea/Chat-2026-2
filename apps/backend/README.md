# IESB Backend (`apps/backend`)

backend de serviços tradicionais de retaguarda desenvolvida em **NestJS**. É responsável por gerenciar rotas institucionais, autenticação, logs e integrações complementares que operam fora da camada de agentes de IA.

## 🚀 Como Executar

Para iniciar o backend em modo de desenvolvimento:
```bash
pnpm --filter backend dev
```
## 🔐 Login do aluno

O chat funciona sem login (visitante). O login só é preciso para o assistente consultar a **própria** matrícula do aluno.

```bash
cp .env.example .env   # preencha AUTH_JWT_SECRET (mínimo 32 caracteres)
pnpm --filter backend dev
```

O backend sobe na porta **3001** (a 3000 é do `mastra-core`).

| Rota | O que faz |
|---|---|
| `POST /api/auth/login` | `{ matricula, senha }` → 200 `{ aluno }` e cookie `chat_session` (JWT, httponly, SameSite=Lax). Senha errada e matrícula inexistente dão o mesmo 401. Depois de 5 falhas na mesma matrícula em 15 min: 429. |
| `GET /api/auth/me` | Devolve o aluno do cookie ou 401. O `mastra-core` chama esta rota a cada mensagem para saber quem está conversando. |
| `POST /api/auth/logout` | Apaga o cookie (204). |

### Contas fictícias de desenvolvimento

Ficam em `src/auth/alunos.ts` (só o hash scrypt). São as mesmas matrículas do mock acadêmico:

| Matrícula | Senha (só desenvolvimento) |
|---|---|
| `12345` | `aluno-12345-dev` |
| `2023001` | `aluno-2023001-dev` |

Quando existir cadastro de verdade (EP-05), essa lista vira tabela no banco.

### Testes

```bash
pnpm --filter backend test:e2e
```
