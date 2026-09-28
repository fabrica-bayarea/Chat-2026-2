# EP03 - Recomendação de Cursos

## 1. Objetivo

Este épico reúne as funcionalidades responsáveis por utilizar o resultado do teste para apresentar cursos do IESB que tenham relação com os perfis identificados.

Além do resultado dos perfis, essa etapa também considera as preferências informadas pelo usuário, como a modalidade de ensino.

## 2. Descrição

Depois que os perfis são calculados, o sistema utiliza os resultados para buscar cursos relacionados às áreas que tiveram maior destaque.

A modalidade escolhida pelo usuário também é considerada durante essa busca. Dessa forma, o sistema evita apresentar opções que não estejam disponíveis na forma de estudo informada.

Ao final, o usuário recebe uma lista de cursos que podem ter relação com seu perfil e com as escolhas feitas durante o teste.

## 3. Critérios de Aceitação

Para que essa etapa seja considerada funcionando corretamente, o sistema deve:

- utilizar os perfis obtidos no resultado do teste;
- considerar a modalidade escolhida pelo usuário;
- verificar quais cursos possuem relação com os perfis identificados;
- apresentar apenas cursos presentes na base utilizada pelo sistema;
- evitar recomendar cursos incompatíveis com a modalidade informada;
- apresentar o resultado de forma clara para o usuário.

## 4. Regras Relacionadas ao Épico

As recomendações devem considerar somente os cursos cadastrados e utilizados pelo projeto.

Um curso só deve ser apresentado quando tiver relação com o perfil identificado e estiver disponível na modalidade escolhida pelo usuário.

O resultado funciona como uma orientação e não como uma escolha definitiva do curso que a pessoa deve fazer.