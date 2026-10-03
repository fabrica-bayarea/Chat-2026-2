# Responsividade

Stack de UI: **React + Vite** (`apps/web`). Os breakpoints abaixo seguem a
convenção do Tailwind CSS, adotada como referência de larguras:

| Breakpoint | Largura mínima | Uso principal |
|---|---|---|
| (padrão) | 0px | Celular, layout em coluna única |
| `sm` | 640px | Celular grande / phablet |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Desktop grande |

## Chat principal (`/`)

- **Mobile (< 768px)**: chat ocupa 100% da largura e altura da viewport
  (`h-screen`), sem margens laterais; input fixo na parte inferior; botões de
  alternativa do teste em coluna, com altura mínima de toque de 44px.
- **Desktop (≥ 768px)**: chat centralizado com largura máxima (`max-w-2xl`),
  como já implementado em `frontend/app/page.tsx`, para não esticar demais as
  bolhas de mensagem em telas largas.
- Bolhas de mensagem: no máximo 80% da largura do container em qualquer
  breakpoint, para manter legibilidade.
- O painel de resultado (perfil + cursos recomendados) empilha verticalmente
  em mobile e pode usar duas colunas (perfil | cursos) a partir de `md`.

## Painel administrativo (`/admin/**`)

- **Mobile**: navegação em menu hambúrguer; tabelas (lista de cursos,
  perguntas, usuários) viram uma lista de cards empilhados, um por
  curso/pergunta/usuário, em vez de tabela com scroll horizontal.
- **Desktop (≥ lg)**: navegação lateral fixa; listas em tabela tradicional.
- Formulários de edição (curso, pergunta) usam campos em coluna única até
  `md`, e duas colunas a partir de `md` quando os campos são curtos (ex.: os
  6 pesos de perfil de um curso).

## Regras gerais

- **RNF-04**: toda a interface deve ser funcional e legível a partir de
  320px de largura, sem scroll horizontal.
- Tipografia mínima de 16px em campos de input (evita zoom automático em
  iOS).
- Áreas clicáveis/tocáveis (botões de alternativa, itens de menu) com no
  mínimo 44×44px.
- Teste manual mínimo em 3 larguras de referência: 375px (celular), 768px
  (tablet), 1440px (desktop) antes de considerar uma tela pronta.

## Acessibilidade (RNF-05)

- Botões de alternativa do teste devem ser navegáveis via teclado (`Tab` +
  `Enter`) e ter foco visível.
- Inputs de texto livre e botões de ação devem ter `aria-label` quando o
  rótulo visível não for suficiente (ex.: ícones sem texto).
- Contraste mínimo AA (4.5:1) entre texto e fundo em ambos os temas
  claro/escuro, caso um tema escuro seja implementado.
