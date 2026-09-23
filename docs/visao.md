# Visão do Produto — Chatbot Universitário

**Versão:** 1.0.0
**Status:** Rascunho
**Data:** Setembro de 2026

---

## 1. Perfil

O Chatbot Universitário é concebido como um ponto de interação conversacional entre a comunidade acadêmica e os conhecimentos, informações e serviços disponibilizados pela instituição.

O produto poderá atender diferentes perfis ao longo de sua evolução, considerando principalmente:

* **Alunos**, que poderão consultar informações acadêmicas, institucionais e serviços relacionados à sua vida universitária;
* **Professores**, que poderão utilizar o chatbot para consultar informações e serviços relacionados às suas atividades acadêmicas;
* **Funcionários e atendentes**, que poderão utilizar o sistema como apoio à consulta de informações e à execução de serviços institucionais;
* **Administradores**, responsáveis pela gestão e configuração dos recursos que sustentam o funcionamento do produto.

Esses perfis representam a direção de evolução do produto e não pressupõem que todos estejam disponíveis desde o início do projeto.

---

## 2. O que é o Chatbot Universitário

O Chatbot Universitário é uma interface conversacional que utiliza Inteligência Artificial para permitir que usuários interajam com informações e serviços da instituição por meio de linguagem natural.

O objetivo é oferecer uma experiência em que o usuário possa expressar uma necessidade sem precisar conhecer previamente qual sistema, serviço, página ou procedimento institucional deve utilizar.

Em vez de exigir que o usuário navegue por diferentes sistemas para encontrar uma informação ou realizar uma operação, o chatbot deverá ser capaz de compreender a intenção apresentada, buscar os conhecimentos necessários e, quando apropriado, utilizar ferramentas e integrações para acessar serviços institucionais.

O produto deverá funcionar como uma camada de interação entre o usuário e o ecossistema de informações e serviços da universidade.

---

## 3. Informações e conhecimentos

O chatbot deverá ser capaz de trabalhar com diferentes tipos de informações relacionadas à universidade.

Essas informações poderão abranger conteúdos acadêmicos, institucionais, administrativos, financeiros e outros conhecimentos relacionados à experiência universitária.

Entre os possíveis conteúdos estão:

* informações sobre cursos;
* disciplinas;
* estrutura curricular;
* quantidade de semestres;
* calendário e informações acadêmicas;
* regras e procedimentos institucionais;
* regulamentos;
* editais;
* documentos acadêmicos e administrativos;
* informações sobre mensalidades, preços e descontos;
* serviços oferecidos pela instituição;
* informações relacionadas à vida acadêmica dos usuários;
* outras informações disponibilizadas pela universidade.

O produto não deverá depender de uma única fonte de informação. O conhecimento utilizado pelo chatbot poderá ser obtido a partir de diferentes fontes, de acordo com a natureza e a finalidade de cada informação.

---

## 4. Conversação

A interação com o produto deverá ocorrer principalmente por meio de uma interface conversacional.

O usuário poderá formular perguntas, solicitações ou comandos utilizando linguagem natural, sem precisar conhecer a estrutura interna dos sistemas da instituição.

A conversação deverá permitir que o sistema compreenda o contexto da solicitação e determine quais informações ou recursos são necessários para respondê-la.

A comunicação entre a interface e os componentes responsáveis pelo processamento da conversa deverá permitir uma experiência interativa e adequada ao funcionamento de um sistema conversacional.

O histórico e outras características relacionadas à experiência de conversação poderão ser definidos conforme a evolução do produto.

---

## 5. Agente de Inteligência Artificial

O núcleo inteligente do produto será baseado em um agente de Inteligência Artificial apoiado por um Large Language Model (LLM).

O agente será responsável por interpretar as solicitações dos usuários, compreender o contexto da conversa e determinar como a necessidade apresentada deverá ser atendida.

Quando uma resposta puder ser obtida a partir do conhecimento disponível, o agente poderá utilizar esse conhecimento para construir a resposta.

Quando a solicitação exigir informações ou operações disponíveis por meio de ferramentas e serviços, o agente deverá ser capaz de utilizar os recursos apropriados.

O agente, portanto, não será apenas um mecanismo de geração de texto. Ele deverá atuar como uma camada de interpretação e orquestração entre a linguagem do usuário, o conhecimento institucional e os serviços disponíveis ao chatbot.

---

## 6. MCP e ferramentas

O Model Context Protocol (MCP) fará parte da arquitetura central do produto como mecanismo de integração entre o agente de Inteligência Artificial e ferramentas ou serviços externos.

Por meio dessa abordagem, o agente poderá utilizar recursos especializados sem precisar conhecer diretamente os detalhes internos de cada sistema integrado.

As ferramentas poderão representar diferentes capacidades disponíveis ao chatbot, como consulta de informações, acesso a dados, integração com sistemas institucionais ou execução de serviços.

A utilização de ferramentas deverá ocorrer de forma controlada e contextualizada, de acordo com a necessidade identificada pelo agente e com as permissões e regras aplicáveis.

A arquitetura deverá permitir a inclusão de novos servidores e ferramentas MCP conforme novos serviços e necessidades sejam incorporados ao produto.

---

## 7. Base de conhecimento e RAG

O produto deverá possuir uma base de conhecimento capaz de reunir informações relevantes da universidade e disponibilizá-las ao agente de Inteligência Artificial.

Para apoiar esse funcionamento, o projeto utilizará uma abordagem de Retrieval-Augmented Generation (RAG).

O RAG permitirá que o sistema busque informações relevantes em suas fontes de conhecimento antes da geração de uma resposta, fornecendo ao modelo um contexto relacionado à solicitação apresentada pelo usuário.

A base de conhecimento poderá ser alimentada por diferentes tipos de fontes, incluindo:

* páginas e conteúdos institucionais;
* documentos da universidade;
* materiais acadêmicos;
* regulamentos e normas;
* informações administrativas;
* bases de dados;
* conteúdos coletados de sistemas ou fontes autorizadas;
* outras fontes relevantes para o funcionamento do chatbot.

A coleta dessas informações poderá utilizar diferentes mecanismos. O scraping, por exemplo, poderá ser utilizado quando apropriado, mas representa apenas uma das possíveis formas de obtenção dos dados.

O objetivo é que o RAG permita ao chatbot responder utilizando conhecimento institucional relevante, mantendo uma separação entre o conhecimento utilizado para responder perguntas e as ferramentas utilizadas para executar operações.

---

## 8. Fontes e documentos

O conhecimento do chatbot poderá ser originado de praticamente qualquer conteúdo institucional relevante e autorizado para utilização pelo sistema.

Documentos poderão incluir materiais acadêmicos, administrativos, financeiros, normativos ou qualquer outro conteúdo relacionado à universidade.

As fontes poderão ser incorporadas ao sistema por diferentes processos, de acordo com suas características.

Uma fonte poderá ser um documento estático, uma página institucional, uma base estruturada, uma informação coletada ou qualquer outro recurso que possa contribuir para a base de conhecimento.

O produto deverá considerar a necessidade de atualização dessas fontes, evitando que informações desatualizadas sejam utilizadas quando houver uma versão mais recente disponível.

---

## 9. Serviços universitários

Além de responder perguntas, o chatbot deverá evoluir para atuar como uma porta de acesso a serviços universitários.

O objetivo é que o usuário possa, progressivamente, utilizar a conversa não apenas para obter informações, mas também para realizar determinadas operações.

Entre os possíveis serviços estão:

* consultas relacionadas à vida acadêmica;
* consulta de disciplinas e informações curriculares;
* acesso a informações de cursos;
* consulta de informações financeiras;
* emissão ou consulta de boletos;
* serviços relacionados a pagamentos;
* consultas e operações relacionadas a sistemas acadêmicos;
* outros serviços disponibilizados pela instituição.

A disponibilidade desses serviços dependerá das integrações existentes, das regras de autorização e das decisões institucionais relacionadas a cada operação.

---

## 10. Integração com sistemas institucionais

O produto deverá ser capaz de se integrar progressivamente ao ecossistema tecnológico da universidade.

Essas integrações poderão envolver sistemas acadêmicos, financeiros, administrativos e outros serviços institucionais.

O chatbot deverá funcionar como uma camada de interação, enquanto os sistemas especializados continuam responsáveis pelos seus próprios dados e operações.

O MCP deverá contribuir para essa integração, permitindo que diferentes serviços sejam disponibilizados ao agente por meio de ferramentas específicas.

Dessa forma, a evolução do chatbot não dependerá da criação de um único sistema que concentre todas as informações e funcionalidades da universidade.

---

## 11. Atendimento e suporte

O chatbot deverá ser capaz de atuar como um primeiro ponto de atendimento para diferentes necessidades dos usuários.

Quando uma solicitação puder ser resolvida por meio do conhecimento disponível ou de uma ferramenta integrada, o sistema deverá buscar realizar o atendimento de forma conversacional.

Para situações que não possam ser adequadamente resolvidas pelo chatbot, o produto poderá evoluir para mecanismos de encaminhamento para atendimento humano.

Essa possibilidade permitirá que o chatbot faça parte de um fluxo maior de atendimento institucional, sem necessariamente substituir os canais e profissionais responsáveis pelos casos que exigem intervenção humana.

---

## 12. Informações e operações do usuário

Conforme o produto evoluir e novas integrações forem disponibilizadas, o chatbot poderá trabalhar com informações específicas relacionadas ao usuário.

Essas informações poderão incluir dados acadêmicos, administrativos ou financeiros necessários para a prestação de determinados serviços.

O acesso e a utilização dessas informações deverão respeitar as regras de autorização aplicáveis a cada perfil e serviço.

O chatbot deverá diferenciar informações gerais, que podem ser consultadas a partir da base de conhecimento, de informações individuais ou operações que dependam de sistemas institucionais e autorização específica.

---

## 13. Administração do produto

O produto deverá possuir mecanismos que permitam sua administração e evolução.

A administração poderá envolver recursos relacionados a:

* usuários e perfis;
* agentes de Inteligência Artificial;
* ferramentas disponíveis;
* servidores MCP;
* integrações;
* fontes de conhecimento;
* documentos;
* configurações do sistema;
* acompanhamento das operações;
* monitoramento e registros.

A administração deverá permitir que o ecossistema de ferramentas, conhecimentos e serviços seja ampliado conforme novas necessidades da universidade sejam identificadas.

---

## 14. Princípios do produto

O desenvolvimento do Chatbot Universitário deverá seguir alguns princípios fundamentais.

### Conversação como interface

A linguagem natural deverá ser o principal meio de interação do usuário com o produto.

### Conhecimento institucional

As respostas relacionadas à universidade deverão utilizar fontes de conhecimento institucionais apropriadas sempre que necessário.

### Integração por ferramentas

O agente deverá utilizar ferramentas e integrações específicas para acessar serviços e dados que não estejam disponíveis apenas por meio do conhecimento do modelo.

### Separação entre conhecimento e operação

Informações utilizadas para responder perguntas e operações realizadas em sistemas externos representam responsabilidades diferentes e deverão ser tratadas de forma adequada.

### Controle

O acesso a informações, ferramentas e operações deverá ser controlado de acordo com o contexto, as permissões e as regras aplicáveis.

### Evolução incremental

A arquitetura deverá permitir que novos conhecimentos, ferramentas, serviços e integrações sejam adicionados sem exigir a reconstrução completa do produto.

### Extensibilidade

O produto deverá ser capaz de evoluir de um chatbot de consulta para uma plataforma conversacional capaz de interagir com diferentes serviços universitários.

---

## 15. Fluxo Geral

De forma conceitual, o funcionamento do produto poderá seguir o seguinte fluxo:

```text
Usuário
   ↓
Interface Conversacional
   ↓
Comunicação com o Backend
   ↓
Agente de Inteligência Artificial
   ↓
┌───────────────────────────────┐
│                               │
│  Base de Conhecimento / RAG   │
│                               │
│             ou                │
│                               │
│       Ferramentas / MCP       │
│                               │
└───────────────────────────────┘
   ↓
Informação ou Serviço
   ↓
Agente de Inteligência Artificial
   ↓
Resposta ao Usuário
```

Dependendo da solicitação, o agente poderá utilizar conhecimento disponível na base de conhecimento, consultar uma ou mais ferramentas, combinar diferentes fontes ou encaminhar a necessidade para um fluxo de atendimento apropriado.

A arquitetura deverá permitir que esse fluxo seja ampliado conforme novos serviços e fontes sejam incorporados ao produto.

---

## 16. Direção do produto

O Chatbot Universitário deverá evoluir de uma interface conversacional capaz de responder perguntas para uma camada inteligente de interação com o ecossistema de informações e serviços da universidade.

A visão de longo prazo é permitir que alunos, professores, funcionários e outros usuários autorizados possam utilizar uma única interface conversacional para encontrar informações, compreender procedimentos e acessar serviços institucionais sem precisar conhecer previamente a estrutura interna dos sistemas responsáveis por essas funcionalidades.

O produto deverá reunir três capacidades principais:

1. **Conhecimento**, por meio de uma base institucional apoiada por RAG;
2. **Inteligência**, por meio de agentes de IA e LLMs capazes de interpretar as necessidades dos usuários;
3. **Ação**, por meio de ferramentas, MCPs e integrações capazes de acessar e operar serviços institucionais.

A combinação dessas capacidades deverá permitir que o chatbot evolua de um simples mecanismo de perguntas e respostas para uma plataforma conversacional capaz de interagir de maneira controlada com diferentes áreas e serviços da universidade.

A primeira etapa do projeto representa apenas o início dessa construção. Seu propósito é estabelecer e validar a base sobre a qual as demais capacidades poderão ser desenvolvidas.

O objetivo final é construir uma **camada conversacional inteligente para acesso ao conhecimento e aos serviços universitários**, capaz de evoluir continuamente conforme novas fontes, ferramentas, sistemas e necessidades sejam incorporados ao ecossistema.
