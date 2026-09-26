# RBAC — Matriz de Permissões

## Perfis

| Perfil | Descrição | Autenticado? |
|---|---|---|
| **Visitante** | Qualquer pessoa acessando o chatbot, sem cadastro. | Não |
| **Usuário Cadastrado** | Visitante que criou conta para salvar histórico de testes. | Sim |
| **Orientador** | Colaborador da instituição parceira. Acompanha métricas agregadas. | Sim |
| **Administrador** | Mantém o catálogo de cursos e o conteúdo do teste. | Sim |

## Matriz de permissões

| Ação | Visitante | Usuário Cadastrado | Orientador | Administrador |
|---|:---:|:---:|:---:|:---:|
| Iniciar o teste vocacional | ✅ | ✅ | ❌ | ❌ |
| Responder ao chat livre (tirar dúvidas) | ✅ | ✅ | ❌ | ❌ |
| Ver o resultado da sessão atual | ✅ | ✅ | ❌ | ❌ |
| Cadastrar-se / fazer login | ✅ (cadastro) | ✅ (login) | ✅ (login) | ✅ (login) |
| Ver histórico de testes anteriores | ❌ | ✅ (próprio) | ❌ | ❌ |
| Ver métricas agregadas de uso | ❌ | ❌ | ✅ | ✅ |
| Exportar relatórios (CSV) | ❌ | ❌ | ✅ | ✅ |
| Criar / editar / remover cursos do catálogo | ❌ | ❌ | ❌ | ✅ |
| Editar texto de perguntas e alternativas | ❌ | ❌ | ❌ | ✅ |
| Gerenciar contas de Administrador/Orientador | ❌ | ❌ | ❌ | ✅ |

## Regras

- **RN-09**: rotas do painel administrativo (`/admin/**` no frontend,
  equivalentes a `/admin/*` no backend) só podem ser acessadas por sessões
  autenticadas com perfil `orientador` ou `administrador`. O backend deve
  validar o perfil a cada requisição (não confiar apenas na ocultação de UI),
  no `apps/backend` (NestJS), por meio de guards de autorização por perfil
  aplicados às rotas administrativas.
- **RN-10**: Orientador tem acesso somente leitura às métricas — qualquer
  tentativa de escrita (CRUD de cursos/perguntas/usuários) deve ser negada
  com 403, mesmo que a rota exista.
- Visitante e Usuário Cadastrado têm exatamente as mesmas permissões em
  relação ao teste e ao chat; a diferença é exclusivamente a persistência do
  histórico entre sessões.

## Perfis futuros (fora de escopo desta fase)

- **Super Administrador**: gerenciaria múltiplas instituições parceiras em um
  cenário multi-tenant. Não necessário enquanto houver uma única instituição.
