# Sitemap

## Área pública (sem autenticação)

```
/                     Chat principal
                       - Boas-vindas + botão "Iniciar teste vocacional"
                       - Fluxo do teste embutido na própria conversa (não é
                         uma rota separada — é um estado da conversa)
                       - Resultado exibido inline ao final do teste
                       - Campo de texto livre para tirar dúvidas, disponível
                         sempre que não houver uma pergunta do teste pendente
/login                Login (usuário cadastrado, orientador, administrador)
/cadastro             Cadastro de usuário (oferecido após concluir o teste)
```

## Área autenticada — Usuário Cadastrado

```
/historico            Lista de sessões de teste concluídas (mais recente primeiro)
/historico/:sessaoId  Detalhe de um resultado passado (perfil, modalidade, cursos)
```

## Área administrativa (Orientador / Administrador — ver rbac.md)

```
/admin                          Dashboard: atalhos + resumo de métricas
/admin/metricas                 Total de testes, distribuição de perfis e
                                 modalidades, exportação CSV
                                 (Orientador: leitura; Administrador: leitura)
/admin/cursos                   Lista de cursos do catálogo
/admin/cursos/novo              Criar curso                    (Administrador)
/admin/cursos/:id               Editar curso                   (Administrador)
/admin/perguntas                Lista das 20 perguntas do teste
/admin/perguntas/:indice        Editar texto da pergunta/alternativas
                                                                (Administrador)
/admin/usuarios                 Gestão de contas de Orientador/Administrador
                                                                (Administrador)
```

## Notas de navegação

- O fluxo do teste vocacional **não** usa rotas por pergunta (ex.:
  `/teste/pergunta/3`) — todo o fluxo acontece como uma sequência de
  mensagens dentro da rota `/`, coordenado via WebSocket
  (`teste:iniciar` → `teste:pergunta` × N → `teste:resultado`).
- `/historico` e `/admin/**` exigem sessão autenticada; o middleware do
  frontend redireciona para `/login` quando ausente, e o backend rejeita a
  requisição independentemente (RN-09 em [rbac.md](rbac.md)).
- Rotas administrativas ficam ocultas na navegação para perfis sem permissão,
  mas isso é só UX — a autorização real é sempre do backend.
