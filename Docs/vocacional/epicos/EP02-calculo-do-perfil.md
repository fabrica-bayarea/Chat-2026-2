# EP02 - Cálculo do Perfil

## 1. Objetivo

Este épico reúne as funcionalidades responsáveis por analisar as respostas dadas pelo usuário e identificar quais perfis tiveram maior relação com as escolhas feitas durante o teste.

A partir dessas respostas, o sistema calcula a pontuação de cada perfil e organiza os resultados para que possam ser usados na etapa de recomendação dos cursos.

## 2. Descrição

Depois que o usuário termina de responder o teste, o sistema utiliza as respostas registradas para calcular a pontuação de cada perfil.

Com base nessa pontuação, são geradas as porcentagens e os perfis são organizados do maior para o menor resultado. Essa classificação é usada para identificar quais áreas tiveram mais relação com as respostas do usuário.

O resultado dessa etapa será utilizado depois na recomendação dos cursos.

## 3. Critérios de Aceitação

Para que essa etapa funcione corretamente, o sistema deve:

- considerar todas as respostas registradas durante o teste;
- somar corretamente os pontos de cada perfil;
- calcular a porcentagem correspondente a cada resultado;
- organizar os perfis do maior para o menor valor;
- identificar quais perfis tiveram maior destaque;
- disponibilizar essas informações para a etapa de recomendação dos cursos.

## 4. Regras Relacionadas ao Épico

Cada resposta deve contribuir apenas para o perfil ao qual ela está relacionada.

O cálculo precisa considerar todas as respostas válidas do teste e utilizar o mesmo critério para todos os perfis.

Caso dois ou mais perfis tenham resultados próximos ou iguais, eles devem continuar aparecendo no resultado para que essa informação possa ser considerada na recomendação dos cursos.