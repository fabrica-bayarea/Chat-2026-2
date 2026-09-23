# Documentação — Docs

A documentação é organizada para separar a **visão geral do produto** dos **requisitos detalhados de cada épico**, permitindo que a visão do projeto permaneça estável enquanto os requisitos de implementação evoluem.

---

## Estrutura

```text
docs/
├── README.md
├── visao.md
└── epicos/
    └── EP-01.md
```

### `visao.md`

Documento de **Visão do Produto**.

Apresenta a direção geral do Chatbot Universitário, incluindo:

- objetivo do produto;
- perfis de usuários;
- interação conversacional;
- agente de Inteligência Artificial;
- uso de MCP e ferramentas;
- base de conhecimento e RAG;
- fontes e documentos;
- serviços universitários;
- integrações com sistemas institucionais;
- atendimento e suporte;
- princípios do produto;
- fluxo conceitual;
- direção de evolução do projeto.

Este documento representa a **visão geral do que o produto pretende se tornar** e não deve ser interpretado como uma especificação detalhada da primeira etapa de desenvolvimento.

---

### epicos

O diretório `epicos/` reúne a documentação dos **épicos do projeto Chat-2026**.

Cada épico representa um conjunto de funcionalidades relacionadas que será desenvolvido ao longo do projeto, contendo os requisitos necessários para orientar o desenvolvimento e a validação das funcionalidades.

## Estrutura

```text
epicos/
├── EP-01.md
├── EP-02.md
└── ...
```

Cada arquivo representa um épico específico.

## Estrutura dos Épicos

Os documentos de épico seguem uma estrutura padronizada, contendo, conforme necessário:

* Descrição do épico;
* Personas;
* Histórias de Usuário (US);
* Regras de Negócio;
* Regras de Validação;
* Regras de Interface;
* Requisitos Não Funcionais;
* Pré-requisitos;
* Critérios de Aceitação.

## Objetivo

O diretório tem como objetivo centralizar os **requisitos funcionais e não funcionais de cada etapa do projeto**, servindo como referência para desenvolvimento, validação e acompanhamento das entregas.

A visão geral e os objetivos de longo prazo do projeto devem ser consultados no documento de **Visão**, enquanto este diretório concentra os requisitos organizados por épico.