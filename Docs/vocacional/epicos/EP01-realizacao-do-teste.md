# EP01 - Realização do Teste Vocacional

## 1. Objetivo

Este épico reúne as funcionalidades relacionadas à realização do teste vocacional, desde o momento em que o usuário inicia o teste até o registro das respostas.

A ideia é garantir que as perguntas sejam apresentadas de forma organizada, que o usuário consiga selecionar suas respostas normalmente e que essas informações sejam armazenadas para serem utilizadas no cálculo do resultado.

## 2. Descrição

Durante essa etapa, o usuário responde às perguntas apresentadas pelo teste e escolhe uma alternativa para cada uma delas.

As perguntas podem aparecer em ordem diferente a cada execução, assim como as alternativas, deixando o teste menos repetitivo.

Cada resposta escolhida é associada a um perfil e registrada para ser utilizada nas etapas seguintes, principalmente no cálculo dos resultados.

## 3. Critérios de Aceitação

Para que essa etapa seja considerada funcionando corretamente, o sistema deve:

- permitir que o usuário inicie o teste;
- apresentar as perguntas de forma clara;
- exibir apenas as alternativas disponíveis para cada pergunta;
- registrar a resposta escolhida pelo usuário;
- associar cada resposta ao perfil correspondente;
- permitir que o teste continue até que todas as perguntas sejam respondidas;
- variar a ordem das perguntas e alternativas sempre que possível;
- manter as respostas registradas até o momento do cálculo do resultado.

## 4. Regras Relacionadas ao Épico

Durante a realização do teste, cada pergunta deve permitir apenas uma resposta por vez.

As alternativas precisam estar ligadas aos perfis utilizados pelo sistema, para que as escolhas feitas pelo usuário possam ser consideradas corretamente no cálculo final.

O teste só deve seguir para a etapa de resultado depois que todas as perguntas necessárias tiverem sido respondidas.