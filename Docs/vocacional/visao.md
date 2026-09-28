
# Teste Vocacional — Especificação Funcional

**Versão:** 1.0  
**Data:** Setembro de 2026  
**Status:** Rascunho  
**Projeto:** Chat-2026-2 — IESB

---

## 1. Introdução

O teste vocacional é uma funcionalidade desenvolvida para o IESB cujo objetivo é orientar o aluno na escolha do curso de ensino superior que melhor se encaixa em seu perfil e em sua disponibilidade para estudar, considerando também a modalidade de ensino.

O teste vocacional é destinado a pessoas que desejam ingressar no ensino superior ou que já estão cursando uma graduação, mas procuram outras opções de cursos oferecidos pelo IESB.

Esta documentação tem como objetivo apresentar as funcionalidades, as regras e os requisitos do teste vocacional, permitindo que outros programadores compreendam seu funcionamento e o estado atual do desenvolvimento, facilitando futuros ajustes e a implementação de novas funcionalidades.


---

## 2. Visão do Produto

### 2.1 O que é o Teste Vocacional

O teste vocacional é uma funcionalidade criada para ajudar o usuário a ter uma ideia mais clara de quais cursos do IESB combinam mais com o seu perfil. Durante o teste, a pessoa responde uma série de perguntas relacionadas aos seus interesses, preferências e também à forma como pretende estudar.
Com base nas respostas, o sistema identifica os perfis que tiveram maior afinidade com o usuário, calcula os resultados e também considera a modalidade de ensino escolhida e a disponibilidade informada. No final, são apresentados cursos do IESB que possuem maior relação com esse resultado, servindo como uma orientação para ajudar na escolha da graduação.

### 2.2 Como funciona o Teste Vocacional

O teste é composto por perguntas que apresentam diferentes situações e preferências ao usuário. Cada alternativa está relacionada a um dos perfis utilizados pelo sistema, como tecnologia, humanidades, artes, negócios, ciências jurídicas e saúde.
Ao longo do teste, as respostas são registradas e utilizadas para calcular quais perfis tiveram maior compatibilidade com o usuário. As perguntas e alternativas são apresentadas em ordem variada para que o teste não siga sempre a mesma sequência.
Além do perfil, o teste também leva em consideração a modalidade de ensino escolhida pelo usuário, como presencial, EAD ou outras opções disponíveis. Com essas informações, o sistema consegue filtrar os cursos do IESB que estejam de acordo com o resultado obtido e com a forma de estudo escolhida.

### 2.3 Público-alvo

O teste é voltado principalmente para pessoas que ainda têm dúvidas sobre qual curso superior escolher e querem conhecer opções do IESB que tenham mais relação com seus interesses. Também pode ser útil para quem já está fazendo uma graduação, mas pensa em mudar de curso ou conhecer outras áreas.
A pessoa não precisa já estudar no IESB para utilizar o teste, já que a proposta é justamente ajudar quem está buscando uma opção de graduação e quer conhecer melhor os cursos disponíveis.
Esse formato fica mais próximo do seu jeito de escrever e menos “texto institucional”. Vou manter esse padrão nas próximas etapas.

### 2.4 Objetivos do Teste Vocacional

O principal objetivo do teste é ajudar o usuário a entender quais áreas e cursos podem ter mais relação com o seu perfil e com as suas preferências.
A ideia é tornar essa escolha um pouco mais simples, apresentando opções de cursos do IESB com base nas respostas dadas durante o teste. O resultado não define qual curso a pessoa deve escolher, mas serve como uma orientação para que ela possa conhecer possibilidades que talvez ainda não tivesse considerado.

### 2.5 Benefícios do Teste Vocacional

O teste pode ajudar o usuário a organizar melhor suas ideias antes de escolher uma graduação. Em vez de procurar cursos sem nenhum direcionamento, ele passa a ter algumas opções que fazem mais sentido de acordo com suas respostas e preferências.
Outro benefício é facilitar o conhecimento dos cursos oferecidos pelo IESB, já que o resultado apresenta alternativas relacionadas ao perfil identificado durante o teste. Dessa forma, o usuário pode comparar melhor as opções antes de tomar uma decisão.

### 2.6 Principais Funcionalidades

Entre as principais funcionalidades do teste está a aplicação das perguntas, o registro das respostas e a identificação dos perfis que mais se destacaram ao final.
O sistema também considera a modalidade de ensino informada pelo usuário e utiliza essas informações para apresentar cursos do IESB que tenham relação com o resultado obtido.
Outro ponto importante é que as perguntas e alternativas podem aparecer em ordens diferentes, evitando que o teste siga sempre a mesma sequência.

### 2.7 Perfis utilizados no teste

As respostas do teste são relacionadas a seis perfis diferentes. Cada um representa um grupo de interesses e características que ajudam a direcionar o resultado final.
Os perfis utilizados são:
- Tecnologia: relacionado a lógica, programação, sistemas e resolução de problemas.
- Humanidades: envolve comunicação, comportamento, sociedade e relações humanas.
- Artes: ligado à criatividade, expressão e produção de conteúdo.
- Negócios: relacionado a gestão, organização, empreendedorismo e tomada de decisões.
- Ciências Jurídicas: envolve leis, argumentação, análise de situações e questões sociais.
- Saúde: relacionado ao cuidado com as pessoas, bem-estar e áreas voltadas à saúde.
Esses perfis são usados durante o cálculo do resultado para identificar quais áreas tiveram mais relação com as respostas do usuário.

### 2.8 Resultado do Teste

Ao finalizar as perguntas, o sistema calcula quais perfis tiveram maior relação com as respostas do usuário e apresenta esse resultado de forma organizada.
Com base nesses perfis e na modalidade de ensino escolhida, o teste mostra cursos do IESB que podem ter mais relação com o usuário. O resultado funciona como uma orientação e não como uma escolha definitiva, já que a decisão final continua sendo da própria pessoa.

### 2.9 Limitações do Teste
O teste vocacional serve como uma forma de orientação e não deve ser considerado como uma definição exata de qual curso o usuário deve escolher. O resultado depende das respostas dadas durante o teste e pode variar de acordo com os interesses e preferências de cada pessoa.
Além disso, o sistema trabalha apenas com os cursos e modalidades disponíveis na base utilizada pelo projeto. Por isso, ele não substitui uma orientação profissional mais aprofundada nem considera todas as possibilidades de graduação existentes fora do IESB.