import random
print("=========================")
print("Sistema Vocacional do IESB")
print("=========================")
print("Olá! Bem vindo ao sistema vocacional do IESB.")
nome = input("Qual é o seu nome?")
print("Prazer," + nome + "!")
print("Vou fazer algumas perguntas para")
print("descobrir quais cursos combinam")
print("mais com o seu perfil.")
pontuacao = {
    "tecnologia": 0,
    "humanidades": 0,
    "artes": 0,
    "negocios": 0,
    "cienciasjuridicas": 0,
    "saude": 0
}
perguntas = []
pergunta1 = {
    "texto": "Quando um problema surge, qual seu primeiro impulso mental?",
    "alternativas": [
        {
            "texto": "Desmontar o problema em partes lógicas para achar a falha no sistema ou no código.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Entender o que as pessoas envolvidas estão sentindo e como aquilo as afeta.",
            "perfil": "humanidades"
        },
        {
            "texto": "Imaginar uma solução que ainda não existe, visualizando o resultado final.",
            "perfil": "artes"
        },
        {
            "texto": "Calcular custo, tempo e quem pode resolver para otimizar recursos.",
            "perfil": "negocios"
        },
        {
            "texto": "Buscar a regra, o precedente ou o princípio que deve ser aplicado.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto":  "Agir com o corpo, testar na prática e sentir o feedback físico imediato.",
            "perfil": "saude"
        }
    ]
   
    
}
pergunta2 = {
    "texto": "Em um trabalho em grupo, qual papel você assume naturalmente?",
    "alternativas": [
        {
            "texto": "O arquiteto da solução técnica, que estrutura o que precisa ser feito.",
            "perfil":"tecnologia"
        },
        {
            "texto": "O mediador que percebe conflitos e garante que todos estejam bem.",
            "perfil": "humanidades"
        },
        {
            "texto": "O que traz a ideia disruptiva e quebra o senso comum.",
            "perfil": "artes"
        },
        {
            "texto": "O que organiza prazos, planilha e cobra entrega.",
            "perfil": "negocios"
        },
        {
            "texto":  "O que questiona se está justo, ético e dentro das regras.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto":  "O que motiva, energiza e coloca o grupo em movimento (treinador/líder de equipe).",
            "perfil": "saude"
 }
    ]
}
pergunta3 = {
    "texto": "O que mais te esgota em um dia de trabalho?",
    "alternativas": [
        {
            "texto": "Ter que lidar com tarefas sem lógica, subjetivas e sem critério claro.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Ter que trabalhar isolado, com máquinas, sem contato humano.",
            "perfil": "humanidades"
        },
        {
            "texto": "Ter que seguir um manual rígido sem espaço para criar nada.",
            "perfil": "artes"
        },
        {
            "texto": "Ter que trabalhar sem meta, sem indicador e sem resultado mensurável.",
            "perfil": "negocios"
        },
        {
            "texto": "Ter que aceitar que 'é assim que funciona' mesmo sendo injusto ou ilegal.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Ter que ficar 8h sentado em uma cadeira sem me movimentar.",
            "perfil": "saude"
        }
    ]
}
pergunta4 = {
    "texto": "Qual tipo de elogio te marca por mais tempo?",
    "alternativas": [
        {
            "texto": "Ninguém teria conseguido resolver isso, foi genial tecnicamente.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Você me escutou de verdade, você fez diferença na minha vida.",
            "perfil": "humanidades"
        },
        {
            "texto": "Isso é original, nunca vi nada igual, é a sua cara.",
            "perfil": "artes"
        },
        {
            "texto": "Você transformou caos em lucro e resultado.",
            "perfil": "negocios"
        },
        {
            "texto": "Seu argumento foi irrefutável, você virou o jogo.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Sua presença, energia e resultado físico são inspiradores.",
            "perfil": "saude"
        }
    ]
}
pergunta5 = {
    "texto": "Imagine sua rotina ideal em 5 anos. Qual cenário te dá mais paz?",
    "alternativas": [
        {
            "texto": "Em um laboratório/escritório tech, resolvendo problemas complexos com foco total.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Em consultório/clínica/laboratório, com pacientes que confiam em você.",
            "perfil": "humanidades"
        },
        {
            "texto": "Em um estúdio, set, agência ou ateliê, criando projetos autorais.",
            "perfil": "artes"
        },
        {
            "texto": "Em sala de reunião, liderando uma empresa ou seu próprio negócio.",
            "perfil": "negocios"
        },
        {
            "texto": "Em um tribunal, escritório ou organização internacional, defendendo uma causa.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Em clínica, academia, palco ou estúdio de atendimento, transformando o corpo/autoestima das pessoas.",
            "perfil": "saude"
        }
    ]
}
pergunta6 = {
    "texto": "Como você lida com ambiguidade?",
    "alternativas": [
        {
            "texto": "Me incomoda; eu preciso transformar ambiguidade em dado, código ou equação.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Eu acolho; ambiguidade faz parte do ser humano e da mente.",
            "perfil": "humanidades"
        },
        {
            "texto": "Eu adoro; é onde nasce a criatividade.",
            "perfil": "artes"
        },
        {
            "texto": "Eu gerencio; defino um processo para reduzir a incerteza e o risco.",
            "perfil": "negocios"
        },
        {
            "texto": "Eu investigo; ambiguidade geralmente esconde uma falha de interpretação da lei/fato.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Eu testo no corpo, na prática, para ver o que funciona.",
            "perfil": "saude"
        }
    ]
}
pergunta7 = {
    "texto": "Qual seu tipo de curiosidade?",
    "alternativas": [
        {
            "texto": "Como as coisas funcionam por dentro? (Sistemas, algoritmos, estruturas)",
            "perfil": "tecnologia"
        },
        {
            "texto": "Por que as pessoas sofrem e como se curam?",
            "perfil": "humanidades"
        },
        {
            "texto": "Como posso contar essa história de um jeito que ninguém contou?",
            "perfil": "artes"
        },
        {
            "texto": "Como isso pode escalar, dar lucro e se tornar sustentável?",
            "perfil": "negocios"
        },
        {
            "texto": "Quem tem razão e como provar com base na norma?",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Como o corpo pode atingir sua melhor performance e beleza?",
            "perfil": "saude"
        }
    ]
}
pergunta8 = {
    "texto": "Em uma discussão, o que te faz perder a paciência?",
    "alternativas": [
        {
            "texto": "Argumento emocional sem dados ou lógica.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Falta de empatia e frieza com a dor do outro.",
            "perfil": "humanidades"
        },
        {
            "texto": "Falta de repertório visual e clichê.",
            "perfil": "artes"
        },
        {
            "texto": "Desorganização, atraso e perda de dinheiro/tempo.",
            "perfil": "negocios"
        },
        {
            "texto": "Falácia lógica, mentira ou desrespeito a uma regra clara.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Preguiça, sedentarismo e descuido com a própria saúde.",
            "perfil": "saude"
        }
    ]
}
pergunta9 = {
    "texto": "Qual foi seu jeito de brincar na infância?",
    "alternativas": [
        {
            "texto": "Desmontava brinquedos, video-game, computador.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Cuidava de bonecos, animais, escutava os amigos.",
            "perfil": "humanidades"
        },
        {
            "texto": "Inventava mundos, desenhava, escrevia, filmava, cozinhava misturas.",
            "perfil": "artes"
        },
        {
            "texto": "Vendia coisas, organizava a barraquinha, era líder da turma.",
            "perfil": "negocios"
        },
        {
            "texto": "Criava regras para o jogo e garantia que todos cumprissem.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Esporte, dança, maquiagem, performance, palco.",
            "perfil": "saude"
        }
    ]
}
pergunta10 = {
    "texto": "O que é SUCESSO para você?",
    "alternativas": [
        {
            "texto": "Ser referência técnica, criar algo que funciona perfeitamente.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Ser indispensável para a saúde mental/física de alguém.",
            "perfil": "humanidades"
        },
        {
            "texto": "Ser reconhecido por um estilo próprio e autêntico.",
            "perfil": "artes"
        },
        {
            "texto": "Ser autônomo financeiramente e construir um império.",
            "perfil": "negocios"
        },
        {
            "texto": "Ser a voz que garante justiça e muda um sistema.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Ser exemplo de disciplina, saúde e transformação visível.",
            "perfil": "saude"
        }
    ]
}
pergunta11 = {
    "texto": "Se olharmos para a sua carga de trabalho e tempo livre hoje, como é a sua semana?",
    "alternativas": [
        {
            "texto": "Trabalho em escala ou jornada cheia, tenho filhos ou compromissos fixos e meu tempo livre aparece de forma fragmentada; sobra pouco ou nada para deslocamento diário.",
            "modalidade": "ead"
        },
        {
            "texto": "Trabalho em horário comercial fixo, mas tenho noites e/ou sábados relativamente livres; consigo me deslocar ao campus 1 ou 2 vezes por semana sem comprometer minha renda.",
            "modalidade": "semipresencial"
        },
        {
            "texto": "Tenho jornada reduzida, estou desempregado ou consigo organizar meu trabalho de forma que me sobrem manhãs ou tardes inteiras livres na maioria dos dias.",
            "modalidade": "presencial"
        },
        {
            "texto": "Trabalho muito, mas em casa ou perto de casa; tenho algumas janelas de tempo livre, porém insuficientes para ida diária ao campus, só para encontros esporádicos.",
            "modalidade": "ead"
        },
        {
            "texto": "Tenho tempo integral disponível (não trabalho ou trabalho poucas horas) e quero usar a maior parte do dia para atividades no campus (aulas, laboratórios, projetos, extensão).",
            "modalidade": "presencial"
        },
        {
            "texto": "Trabalho em horário comercial, mas consigo liberar 2 ou 3 períodos na semana para ir ao campus; o resto do estudo precisa ser no meu horário, sem depender de aula presencial diária.",
            "modalidade": "semipresencial"
        }
    ]
}
pergunta12 = {
    "texto": "Quando você erra, o que dói mais?",
    "alternativas": [
        {
            "texto": "Não ter previsto a falha lógica.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Ter magoado ou decepcionado alguém.",
            "perfil": "humanidades"
        },
        {
            "texto": "Ter feito algo sem alma, genérico.",
            "perfil": "artes"
        },
        {
            "texto": "Ter perdido tempo, dinheiro ou oportunidade.",
            "perfil": "negocios"
        },
        {
            "texto": "Ter sido injusto ou tecnicamente incorreto.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Não ter dado o seu máximo físico.",
            "perfil": "saude"
        }
    ]
}
pergunta13 = {
    "texto": "Qual ambiente te dá energia em vez de tirar?",
    "alternativas": [
        {
            "texto": "Silêncio, 2 monitores, problema difícil e café.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Sala reservada, escuta profunda, sigilo e vínculo.",
            "perfil": "humanidades"
        },
        {
            "texto": "Caos criativo, referências visuais, música, texturas, sabores.",
            "perfil": "artes"
        },
        {
            "texto": "Planilha aberta, meta batida, cliente fechado.",
            "perfil": "negocios"
        },
        {
            "texto": "Debate intenso, argumentação, livros e jurisprudência.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Cheiro de clínica, academia, cozinha profissional, camarim.",
            "perfil": "saude"
        }
    ]
}
pergunta14 = {
    "texto": "Você prefere ser lembrado como:",
    "alternativas": [
        {
            "texto": "O gênio que construiu o sistema.",
            "perfil": "tecnologia"
        },
        {
            "texto": "O profissional que salvou/curou/acolheu.",
            "perfil": "humanidades"
        },
        {
            "texto": "O artista que criou um universo.",
            "perfil": "artes"
        },
        {
            "texto": "O CEO que gerou empregos e riqueza.",
            "perfil": "negocios"
        },
        {
            "texto": "O jurista que defendeu o que era certo.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "O especialista que transforma corpos e autoestima.",
            "perfil": "saude"
        }
    ]
}
pergunta15 = {
    "texto": "Qual seu medo profissional oculto?",
    "alternativas": [
        {
            "texto": "Ficar obsoleto tecnologicamente.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Não conseguir ajudar alguém que precisa de mim.",
            "perfil": "humanidades"
        },
        {
            "texto": "Ser apenas mais um, sem identidade criativa.",
            "perfil": "artes"
        },
        {
            "texto": "Ficar estagnado sem crescimento financeiro.",
            "perfil": "negocios"
        },
        {
            "texto": "Ver uma injustiça acontecer e não poder agir.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Não conseguir entregar uma transformação real e visível.",
            "perfil": "saude"
        }
    ]
}
pergunta16 = {
    "texto": "Como você aprende melhor?",
    "alternativas": [
        {
            "texto": "Lendo documentação, testando e errando sozinho até funcionar.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Estudando casos clínicos, ouvindo histórias e supervisão.",
            "perfil": "humanidades"
        },
        {
            "texto": "Fazendo moodboard, protótipo, degustação, ensaio.",
            "perfil": "artes"
        },
        {
            "texto": "Com case real de mercado, mentoria e números.",
            "perfil": "negocios"
        },
        {
            "texto": "Lendo, fichando e debatendo tese e antítese.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Com demonstração prática, repetição e feedback corporal imediato.",
            "perfil": "saude"
        }
    ]
}
pergunta17 = {
    "texto": "Qual frase te representa?",
    "alternativas": [
        {
            "texto": "Tudo é um sistema que pode ser otimizado.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Toda dor tem uma história que precisa ser escutada.",
            "perfil": "humanidades"
        },
        {
            "texto": "Se não existe, eu vou criar.",
            "perfil": "artes"
        },
        {
            "texto": "Toda ideia só vale se for viável.",
            "perfil": "negocios"
        },
        {
            "texto": "Sem regra clara, há barbárie.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "O corpo fala o que a mente não diz.",
            "perfil": "saude"
        }
    ]
}
pergunta18 = {
    "texto": "Se te dessem R$ 100 mil hoje para investir em um projeto seu:",
    "alternativas": [
        {
            "texto": "Montaria um app/lab de IA, cibersegurança ou automação.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Abriria uma clínica de atendimento humanizado.",
            "perfil": "humanidades"
        },
        {
            "texto": "Produziria um filme, coleção de moda, restaurante autoral ou game.",
            "perfil": "artes"
        },
        {
            "texto": "Abriria uma empresa ou franquia com plano de negócios.",
            "perfil": "negocios"
        },
        {
            "texto": "Abriria um escritório ou consultoria jurídica focada em uma causa.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Montaria um estúdio de alta performance, estética avançada ou gastronomia.",
            "perfil": "saude"
        }
    ]
}
pergunta19 = {
    "texto": "Qual tipo de problema você gostaria de resolver no Brasil?",
    "alternativas": [
        {
            "texto": "Segurança de dados, infraestrutura e inovação tecnológica.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Saúde mental, acesso à saúde e qualidade de vida.",
            "perfil": "humanidades"
        },
        {
            "texto": "Falta de identidade cultural, design e narrativa no mercado.",
            "perfil": "artes"
        },
        {
            "texto": "Má gestão, falta de empreendedorismo e burocracia.",
            "perfil": "negocios"
        },
        {
            "texto": "Injustiça, impunidade e falta de acesso a direitos.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Sedentarismo, baixa autoestima e má alimentação.",
            "perfil": "saude"
        }
    ]
}
pergunta20 = {
    "texto": "Quando você está sob pressão extrema, o que seu cérebro faz?",
    "alternativas": [
        {
            "texto": "Fica ainda mais lógico e frio, hiperfoca.",
            "perfil": "tecnologia"
        },
        {
            "texto": "Fica hipervigilante aos sentimentos dos outros.",
            "perfil": "humanidades"
        },
        {
            "texto": "Foge criando e imaginando alternativas.",
            "perfil": "artes"
        },
        {
            "texto": "Entra em modo execução e resolve o que dá dinheiro primeiro.",
            "perfil": "negocios"
        },
        {
            "texto": "Busca a norma e argumenta com mais força.",
            "perfil": "cienciasjuridicas"
        },
        {
            "texto": "Precisa se mexer, respirar e agir para descarregar.",
            "perfil": "saude"
        }
    ]
}
perguntas.append(pergunta1)
perguntas.append(pergunta2)
perguntas.append(pergunta3)
perguntas.append(pergunta4)
perguntas.append(pergunta5)
perguntas.append(pergunta6)
perguntas.append(pergunta7)
perguntas.append(pergunta8)
perguntas.append(pergunta9)
perguntas.append(pergunta10)
perguntas.append(pergunta11)
perguntas.append(pergunta12)
perguntas.append(pergunta13)
perguntas.append(pergunta14)
perguntas.append(pergunta15)
perguntas.append(pergunta16)
perguntas.append(pergunta17)
perguntas.append(pergunta18)
perguntas.append(pergunta19)
perguntas.append(pergunta20)

letras = "ABCDEF"
for pergunta in perguntas:
    random.shuffle(pergunta["alternativas"])
    print(pergunta["texto"])
    for indice, alternativa in enumerate(pergunta["alternativas"]):
        print(letras[indice], alternativa["texto"])

    resposta = input("Escolha uma alternativa:").upper()

    while resposta not in letras:
        print("Resposta inválida. Por favor, escolha uma alternativa entre A e F.")
        resposta = input("Escolha uma alternativa: ").upper()
    posicao = letras.index(resposta)
    alternativa_escolhida = pergunta["alternativas"][posicao]
    if "perfil" in alternativa_escolhida:
        perfil_escolhido = alternativa_escolhida["perfil"]
        pontuacao[perfil_escolhido] += 1
    else:
        modalidade_escolhida = alternativa_escolhida["modalidade"]


porcentagem_tecnologia = (pontuacao["tecnologia"] / 19) * 100

porcentagens = {}

for perfil in pontuacao:
    porcentagem = round((pontuacao[perfil] / 19) * 100, 2)
    porcentagens[perfil] = porcentagem

ranking_perfis = sorted(porcentagens, key=porcentagens.get, reverse=True)

cursos = [
    {
        "nome": "Análise e Desenvolvimento de Sistemas",
        "modalidades": ["presencial", "ead"],
        "perfis": {
            "tecnologia": 1.0,
            "humanidades": 0.1,
            "artes": 0.3,
            "negocios": 0.4,
            "cienciasjuridicas": 0.1,
            "saude": 0.0
        }
    },
    {
        "nome": "Administração",
        "modalidades": ["ead"]
    }
]

for curso in cursos:
    print(curso["nome"])

    if modalidade_escolhida in curso["modalidades"]:
        print("Curso compatível com a modalidade escolhida.")
    else:
        print("Curso incompatível com a modalidade escolhida.")
