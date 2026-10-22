# Visão do Produto — Chatbot Vocacional

## Problema

Pessoas que vão prestar vestibular ou ingressar na faculdade frequentemente não
sabem qual curso escolher. A decisão costuma ser tomada com pouca informação
sobre o próprio perfil (o que a pessoa gosta de fazer, como pensa, o que a
motiva) e sobre como os cursos disponíveis se conectam a esse perfil.

## Solução

Um chatbot conversacional que:
1. Aplica um **teste vocacional** de 20 perguntas, identificando o perfil
   predominante da pessoa entre 6 perfis (tecnologia, humanidades, artes,
   negócios, ciências jurídicas, saúde);
2. Recomenda cursos compatíveis com esse perfil **e** com a modalidade de
   estudo compatível com a rotina da pessoa (presencial, semipresencial ou EAD);
3. Permite tirar dúvidas livres sobre carreira e cursos a qualquer momento da
   conversa, respondidas por um modelo de linguagem (LLM).

## Público-alvo

- **Visitante**: pessoa decidindo qual curso escolher (pré-vestibular, ensino
  médio, ou adulto em transição de carreira). É o usuário principal do produto.
- **Administrador**: responsável por manter o catálogo de cursos e o conteúdo
  do teste atualizados.
- **Orientador**: colaborador da instituição parceira que acompanha métricas
  agregadas de uso, sem precisar editar conteúdo.

Perfis de acesso e permissões detalhados em [rbac.md](rbac.md).

## Objetivos

- Dar uma recomendação de curso com fundamento (perfil + modalidade), não um
  palpite genérico.
- Reduzir a barreira de entrada: o teste e o chat funcionam sem cadastro.
- Permitir que a pessoa converse livremente com o assistente, não apenas
  responda a um formulário.

## Fora de escopo (nesta fase)

- Integração com vestibular/inscrição em cursos.
- Pagamento ou matrícula.
- Edição da estrutura das 20 perguntas (quantidade, associação
  pergunta→perfil) pela interface administrativa — apenas o texto é editável
  (ver [EP-07](../epicos/EP-07.md)).

## Métricas de sucesso (iniciais)

- Taxa de conclusão do teste (quem inicia vs. quem chega ao resultado).
- Distribuição de perfis e modalidades entre quem completa o teste.
- Volume de mensagens de chat livre por sessão (indica se o assistente está
  sendo usado para tirar dúvidas de verdade, não só para o teste).

## Stack

Mesma stack do monorepo Chat-2026 (ver `README.md` da raiz do repositório):
React + Vite + TypeScript no frontend (`apps/web`), NestJS no backend
(`apps/backend`) e Mastra para agentes, RAG e integração MCP
(`apps/mastra-core`).

## Pendência conhecida

O catálogo de cursos usado no cálculo de recomendação é uma estimativa inicial
(ver [teste_vocacional.ts](teste_vocacional.ts)) e **precisa ser
validado ou substituído pelo catálogo oficial da instituição parceira** antes
de qualquer uso em produção.
