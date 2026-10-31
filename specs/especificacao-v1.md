# App de treino: especificação v1

[English](specification-v1.en.md) · **Português**

Data: 2026-10-20 · Versão 1.23 (ajustes feitos durante a implementação marcados com v1.1; novas funcionalidades marcadas com v1.2 a v1.23)

## 0. Decisões fechadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA instalada no ecrã inicial do iPhone; também abre em qualquer navegador |
| Dados | Só no dispositivo (IndexedDB), com exportação e importação de cópia de segurança. Sincronização fica fora da v1 |
| Utilizadores | Um por dispositivo, sem login. Outras pessoas (homens ou mulheres) usam a app no seu próprio telemóvel; os dados não são partilhados (v1.3) |
| Plano | Gerado por regras determinísticas a partir da anamnese, sem IA |
| Restrições | Uma dor nunca avaliada gera recomendação de avaliação; exercícios contraindicados são substituídos |
| Língua | Interface em português de Portugal, inglês e espanhol (v1.8, F21); documentação em português e inglês |
| Metodologia | SDD (esta especificação manda) + TDD no domínio + DDD leve |

## 1. Linguagem do domínio

Estes nomes são usados iguais na especificação, no código e na interface.

| Termo | Significado |
|---|---|
| **Anamnese** | Dados pessoais, objetivo, disponibilidade, experiência, restrições e rastreio PAR-Q+ |
| **Restrição** | Zona do corpo com dor ou limitação (ombro, joelho, lombar, punho, anca, cotovelo) e intensidade habitual |
| **Exercício** | Entrada do catálogo: nome, grupo muscular principal e secundários, tipo (composto/isolado), equipamento, link de vídeo, objetivo, contraindicações, substitutos, incremento de carga |
| **Plano** | Conjunto ordenado de Treinos-modelo gerado a partir da Anamnese, com a versão das regras usada |
| **Treino-modelo** | Ex.: "Superior A". Lista de Prescrições |
| **Prescrição** | Exercício + séries + faixa de repetições + RIR alvo + descanso + nota |
| **Sessão** | Execução real de um Treino-modelo numa data |
| **Série** | Registo de carga (kg), repetições e RIR |
| **Dor** | Avaliação 0–10 de um Exercício numa Sessão |
| **Medição** | Peso e cintura numa data |
| **Foto de avaliação** (v1.4) | Foto do corpo numa data e numa pose (frente, lado, costas), para comparação pessoal |
| **Perfil** (v1.4) | Nome e foto da pessoa, usados na saudação |
| **Sugestão** | Carga e repetições propostas para a próxima Sessão (calculada, não guardada) |
| **Bloco** (v1.2) | Ciclo de semanas de progressão terminado por uma semana de descarga; a duração depende do objetivo |
| **Descarga** | Semana com metade das séries e RIR 3–4, para recuperar antes do bloco seguinte |
| **Conquista** (v1.2) | Marco calculado a partir do histórico (ex.: 10 treinos, 4 semanas seguidas cumpridas) |
| **Alongamento** (v1.6) | Entrada do catálogo de alongamentos: nome, grupo muscular, posição, um ou dois lados, passos, cuidados e contraindicações |

## 2. Funcionalidades e critérios de aceitação

### F1. Anamnese
- Campos: idade, altura, peso, cintura, sexo, objetivo (recomposição, hipertrofia, força, saúde geral), dias por semana (2–7), duração da sessão (45/60/75 min), experiência (iniciante, regresso após paragem, intermédio), equipamento (ginásio completo, halteres, casa; desde a v1.17, uma lista, ver F28), restrições (zonas com dor, ou «Nenhuma»), aceita cardio (sim/não), PAR-Q+ (7 perguntas gerais). (v1.3) Ênfase do plano (equilibrado, mais pernas e glúteos, mais tronco), para qualquer sexo. Se o sexo for feminino: gravidez ou pós-parto (não; grávida no 1.º trimestre; grávida no 2.º ou 3.º trimestre; pós-parto há menos de 12 meses).
- **Dado** que respondo "sim" a alguma pergunta do PAR-Q+, **quando** guardo, **então** vejo um aviso a recomendar avaliação médica antes de treinar, e o plano é gerado com intensidade conservadora e marcado como tal.
- **Dado** que indico uma restrição sem avaliação profissional, **então** a app mostra uma recomendação para avaliação, sem bloquear.
- (v1.3) **Dado** que indico gravidez ou pós-parto, **então** o plano é conservador e aparece um aviso a recomendar acompanhamento do médico ou obstetra (e, no pós-parto, avaliação do pavimento pélvico por fisioterapeuta). No 2.º e 3.º trimestres não aparecem exercícios deitado de costas ou de barriga para baixo.
- (v1.3) A pergunta de gravidez só aparece com sexo feminino; mudar o sexo para outro valor apaga a resposta.
- **Quando** altero a anamnese, **então** a app pergunta se quero gerar um novo plano; o histórico mantém-se.
- (v1.2) **Dado** que marco «Nenhuma» nas dores ou limitações, **então** as zonas ficam desmarcadas, o plano usa os exercícios base e não há avisos de avaliação. Para guardar é preciso marcar «Nenhuma» ou pelo menos uma zona.

### F2. Geração do plano (regras, ver secção 3)
- **Dado** uma anamnese, **quando** gero o plano, **então** o resultado é sempre o mesmo para os mesmos dados (determinístico).
- **Dado** uma restrição de ombro, **então** nenhum exercício com contraindicação de ombro aparece; é usado o primeiro substituto compatível.
- **Então** cada Treino-modelo cabe na duração declarada (estimativa da secção 3.5).
- **Então** cada Prescrição mostra o motivo resumido (ex.: "substitui supino com barra por causa do ombro").
- (v1.16) **Dado** o equipamento «Em casa, sem equipamento», **então** cada treino tem pelo menos 4 exercícios e a semana treina peito, costas, quadríceps, posteriores e glúteos (regras na secção 3.9).

### F3. Treino de hoje
- A app propõe o próximo Treino-modelo da sequência (rotação, não dia da semana). Posso escolher outro.
- Lista os exercícios com: nome, grupo muscular principal, séries × reps, estado (por fazer / em curso / feito / saltado).
- No topo: síntese do objetivo do treino (ex.: "Superior A: empurrar e puxar horizontal; foco em peito e costas").
- **Dado** que todos os exercícios estão feitos ou saltados, **então** a sessão aparece como **completa**, e saltados ficam assinalados.
- **Dado** que fecho a app a meio, **quando** volto, **então** a sessão em curso está como a deixei.

### F4. Registo durante o exercício
- Por série: carga, repetições, RIR (0–5). Os valores vêm pré-preenchidos com a Sugestão.
- Mostra a sessão anterior desse exercício ("última vez: 20 kg × 10, 10, 9").
- No fim do exercício: dor 0–10 (opcional, por defeito 0).
- Ao concluir uma série inicia o temporizador de descanso da Prescrição, com vibração/aviso visual no fim (em iPhone o som em segundo plano não é garantido).
- Botão "substituir" mostra os substitutos do catálogo compatíveis com as restrições.
- Botões grandes, utilizáveis com uma mão.

### F5. Detalhe do exercício
- Grupo principal e secundários, objetivo do exercício em 1–2 frases, pontos-chave de execução, contraindicações.
- **Quando** toco no vídeo, **então** abre um leitor sobreposto dentro da app.
- **Dado** que o vídeo não permite incorporação ou o link não é de um domínio permitido, **então** aparece o botão "abrir no YouTube/Vimeo".
- (v1.2) Anúncios: a app não bloqueia anúncios do YouTube. O leitor é do YouTube, noutra origem, e a app não o pode alterar; contornar anúncios viola os termos do YouTube. Sem anúncios: links do Vimeo, ou abrir no YouTube com YouTube Premium.

### F6. Progressão (regras, ver secção 4)
- **Dado** o histórico, **quando** abro um exercício, **então** vejo a Sugestão e o motivo (ex.: "fizeste 12 reps em todas as séries: sobe para 22 kg").

### F7. Relatório 1: progressão por exercício
- Gráfico de 1RM estimado (Epley, só séries com ≤ 12 reps) e melhor série por sessão.
- Marca de recorde pessoal.
- Linha de dor por sessão no mesmo exercício.

### F8. Relatório 2: semana em resumo
- Aderência: sessões feitas vs planeadas (últimas 4 semanas).
- Séries efetivas por grupo muscular vs alvo (secção 3.3).
- Tendência de peso e cintura (média móvel de 7 dias para o peso).

### F9. Medições
- Registo rápido de peso e cintura. Lembrete visual se passaram mais de 7 dias.
- (v1.5) Medidas opcionais: peito, braço, anca e coxa (cm), com instruções de onde medir. Todas entram na comparação de fotos (F15).

### F10. Cópia de segurança
- Exportar tudo em JSON (e histórico em CSV). Importar JSON com validação de esquema; ficheiro inválido é rejeitado sem alterar dados.
- Lembrete visual se passaram mais de 14 dias desde a última exportação.

### F11. Início (v1.2)
- Primeiro separador da barra inferior e ecrã de abertura da app. Painel minimalista, só leitura.
- Mostra: treinos na semana vs meta (dias por semana), horas de treino na semana e no mês, sequência de semanas cumpridas, próximo treino, fase do bloco e próxima mudança (F14), volume da semana vs semana anterior (carga × reps), recordes no mês, aderência das últimas 4 semanas, tendência de peso (média de 7 dias, variação em 4 semanas), frase do dia.
- Horas de treino: soma de fim − início das sessões terminadas; cada sessão conta no máximo 3 h (uma sessão esquecida aberta não distorce o total). Semana de segunda a domingo; mês civil.
- **Dado** que não há sessões, **então** o painel mostra zeros e o próximo treino, sem erros.

### F12. Conquistas e sequência (v1.2)
- Calculadas a partir do histórico, nunca guardadas; importar uma cópia recalcula-as.
- Semana cumprida: treinos terminados na semana (segunda a domingo) ≥ dias por semana do plano. Sequência: semanas cumpridas seguidas até à semana atual; a semana atual só conta quando já está cumprida e não quebra a sequência enquanto decorre.
- Semana com recorde de volume: volume (soma de carga × reps) maior do que o de todas as semanas anteriores, a partir da segunda semana com treinos.
- Conquistas: primeiro treino; 10, 25, 50 e 100 treinos; primeira semana cumprida; 4 e 12 semanas seguidas; primeiro recorde pessoal; 10 recordes pessoais; primeira semana com recorde de volume; um bloco completo (pelo menos um treino terminado em cada semana de um bloco, descarga incluída).
- A sequência é semanal e não diária, porque os dias de descanso fazem parte do plano.

### F13. Frase do dia e lembretes (v1.2)
- O Início mostra uma frase curta de motivação, escolhida de forma determinística a partir da data numa lista fixa de frases em português.
- (v1.4) A frase aparece entre aspas duplas (“…”). Quando a autoria está bem documentada, o autor aparece por baixo (ex.: Juvenal, Fernando Pessoa, Lao Tsé). Frases de autoria duvidosa ou desconhecida aparecem sem autor; provérbios aparecem como «Provérbio».
- Lembretes: decisão do utilizador (2026-10-20): **sem lembretes**. Motivo técnico: no iPhone uma app web não consegue agendar notificações locais, e notificações push exigem um servidor, o que contraria «dados só no dispositivo». Alternativa avaliada e não adotada: ficheiro de calendário (.ics) com um lembrete diário, a uma hora fixa ou 15 a 20 min antes do horário habitual.

### F15. Fotos de avaliação (v1.4)
- Separador «Fotos» na barra inferior.
- Adicionar foto: data (por omissão hoje), pose (frente, lado, costas) e nota opcional. A foto vem da câmara ou da galeria.
- Antes de gravar, a imagem é redimensionada (lado maior até 1280 px) e recodificada em JPEG. Isto reduz o tamanho e remove os metadados (incluindo localização GPS).
- As fotos são agrupadas por mês, da mais recente para a mais antiga.
- Comparar: escolho dois meses e uma pose e vejo as fotos lado a lado, cada uma com o peso e a cintura da medição mais próxima (até 7 dias de diferença) e a diferença entre as duas.
- Lembrete visual se passaram mais de 30 dias desde a última foto. Dica: mesma luz, mesma hora do dia, mesma distância.
- As fotos ficam só no dispositivo. A cópia de segurança JSON inclui-as (avisando que o ficheiro contém fotos); o CSV não.
- A app não analisa as fotos automaticamente (sem IA); a análise é a comparação visual com as medições.
- (v1.5) Guia «Como tirar as fotos»: mesma hora (de manhã, em jejum), mesma luz e fundo liso, telemóvel à altura do peito a cerca de 2 m, roupa justa ou de banho, postura relaxada, as três poses, uma vez por mês.
- (v1.5) «Relatório para o PT» (PDF), a partir da comparação: para os dois meses escolhidos, as fotos de cada pose lado a lado, as medições perto dessas datas e as diferenças, treinos e séries do período, dores de 4/10 ou mais e um espaço em branco para as notas do personal trainer. A app junta o material; a análise é feita pelo profissional. As fotos entram no PDF tal como estão guardadas (JPEG sem metadados). O PDF é gerado no dispositivo e só sai dele se eu o partilhar.

### F16. Perfil e saudação (v1.4)
- Em «Mais»: nome (até 40 caracteres) e foto de perfil (redimensionada para 256 px, mesmo tratamento das fotos de avaliação). Ambos opcionais.
- No Início: «Bom dia», «Boa tarde» ou «Boa noite», seguido do nome se existir, conforme a hora do dispositivo: 5h00–11h59 bom dia, 12h00–19h59 boa tarde, 20h00–4h59 boa noite. Mostra a foto de perfil, se existir.

### F17. Exportar ficha e histórico (v1.5)
- Em «Mais», secção «Exportar»: ficha de treino (plano atual com exercícios, grupos, séries, repetições, RIR e descanso) e histórico (sessões, séries e medições), em PDF, Excel (.xlsx) e JSON.
- PDF e Excel são gerados no dispositivo, sem serviços externos nem bibliotecas de terceiros. O Excel tem as folhas «Ficha», «Histórico» e «Medições». Os PDF da ficha e do histórico têm só texto; o único PDF com fotos é o relatório para o PT (F15).
- O JSON da ficha e do histórico é a cópia de segurança (F10).

### F18. Catálogo alargado e imagens dos músculos (v1.5)
- Catálogo com pelo menos 70 exercícios, com as mesmas regras (equipamento, contraindicações, substitutos).
- Cada exercício mostra um desenho do corpo (frente e costas) com o grupo principal destacado e os secundários em tom mais claro. Os desenhos vêm da biblioteca react-native-body-highlighter (licença MIT, uso comercial permitido; o aviso de licença acompanha o código e aparece em «Sobre»). Corpo feminino se o sexo na anamnese for feminino; masculino nos outros casos. Escolhido pelo Guilherme em 2026-10-24, entre quatro opções comparadas.
- Exercícios novos podem não ter vídeo: aparece «Procurar no YouTube» e posso guardar o link escolhido (já existente).

### F19. Alongamentos (v1.6)
- Ecrã «Alongar», aberto a partir do Início, do treino de hoje e do lembrete no fim do treino. Não é um separador novo na barra de baixo, para a barra não ficar apertada no iPhone.
- Dois modos:
  - «Do treino»: um alongamento por grupo muscular trabalhado como principal no treino, pela ordem dos exercícios, até 6 grupos. O treino é o último terminado nas últimas 12 horas; se não houver, o próximo treino.
  - «Por grupo muscular»: escolho um grupo, vejo o desenho do corpo com esse grupo destacado (mesma biblioteca de F18) e todos os alongamentos compatíveis para ele.
- Cada alongamento mostra: o desenho do corpo com o grupo destacado, a dose (2 × 30 s; por lado quando é de um só lado), os passos escritos, os cuidados, um temporizador para o tempo de manutenção, «Procurar no YouTube» e «Mudar vídeo» (link do YouTube ou Vimeo guardado, como nos exercícios).
- GIFs: não incluídos. Não encontrei uma coleção de GIFs de alongamentos com licença clara para uso comercial; o vídeo e as instruções escritas cobrem a orientação.
- Regras: alongamento estático, até sentir tensão ligeira e nunca dor, 2 repetições de 30 s por músculo (ACSM: manter 10–30 s, cerca de 60 s no total por músculo). A app diz com honestidade que alongar melhora a flexibilidade mas não evita as dores musculares do dia seguinte (revisão Cochrane, 2011).
- Restrições: um alongamento com contraindicação numa zona marcada com dor não aparece. No 2.º e 3.º trimestre de gravidez, os alongamentos deitado de costas ou de barriga não aparecem.
- Lembrete: depois de terminar um treino, o ecrã Hoje e o Início mostram «Hora de alongar», com o tempo estimado, até eu escolher «Feito» ou «Hoje não», o que fica guardado na sessão (e na cópia de segurança). Só aparece para treinos terminados nas últimas 12 horas. É um aviso dentro da app; continua a não haver notificações (F13).

### F20. Atualizações e novidades (v1.7)
- A app procura uma versão nova quando abre e sempre que volta ao primeiro plano. No iPhone a app instalada fica muitas vezes em memória, por isso procurar só na abertura não chegava.
- A versão nova descarrega em segundo plano e fica à espera. Quando está pronta, aparece no topo de qualquer ecrã (menos no registo de um exercício, para não interromper uma série) o aviso «Nova versão disponível: X», com o resumo do que muda e os botões «Atualizar agora» e «Depois».
  - «Atualizar agora» ativa a versão nova e recarrega a app. Os dados ficam, porque estão no dispositivo e cada série é gravada ao concluir.
  - «Depois» esconde o aviso até a app voltar a abrir. Se a app for fechada por completo, a versão nova entra na abertura seguinte.
  - Sem internet ou com o ficheiro de novidades inválido, o aviso aparece sem resumo («Correções e melhorias.»).
- Em «Mais», cartão «Atualizações»:
  - a versão instalada;
  - «Procurar atualizações», com o resultado: «Já tens a versão mais recente.», «Nova versão pronta.» (e o botão passa a «Atualizar agora») ou «Sem ligação à internet. Tenta mais tarde.»;
  - «Em preparação»: o que está a ser feito ou em estudo e ainda não chegou à app;
  - «Novidades de cada versão»: o histórico com o resumo de cada versão.
- Depois de atualizar, o Início mostra uma vez «Novidades da versão X» com o que mudou desde a última versão vista, até eu tocar em «Fechar». A versão vista fica só no dispositivo (não entra na cópia de segurança).
  - Numa instalação nova não aparece: para quem acabou de chegar não há nada que tenha mudado.
  - Quem já usava a app antes da 1.7 vê as novidades da 1.7.
- O resumo vem de `src/novidades.json`, que cada alteração com funcionalidades novas atualiza. A versão mais recente desse ficheiro é a versão da app e tem de ser igual à do `package.json`.
- É um aviso dentro da app, visível com a app aberta. Não há notificação com a app fechada: no iPhone isso exige notificações push e um servidor (F13).
- Passagem da 1.6: a 1.6 não tem o aviso, por isso a 1.7 entra sozinha na abertura seguinte, como as versões anteriores; a partir daí as versões novas esperam pelo «Atualizar agora».

### F21. Idiomas (v1.8)
- A app está em português de Portugal, inglês e espanhol: todos os ecrãs, os nomes e as sínteses dos treinos, os avisos e as notas do plano, as sugestões de progressão, os catálogos de exercícios e de alongamentos, as frases do dia, as conquistas, as novidades e as exportações em PDF e Excel. No CSV traduzem-se os nomes dos exercícios; os cabeçalhos das colunas ficam fixos, para não estragar folhas de cálculo que já os usem.
- Na primeira abertura o idioma segue o do telemóvel: português se for português (de qualquer país), espanhol se for espanhol, inglês nos restantes.
- Muda-se no ecrã de boas-vindas e em «Mais», cartão «Idioma · Language». A escolha fica só no dispositivo (não entra na cópia de segurança) e aplica-se logo, sem recarregar.
- O plano guardado não muda ao trocar de idioma: os nomes, os avisos e as notas são mostrados no idioma atual. Os nomes dos exercícios no histórico também.
- O idioma de cada frase é o português: o código marca cada texto com `t('…')` e as traduções estão em `src/i18n/en.json` e `src/i18n/es.json`; os textos dos catálogos estão em `src/catalog/i18n/`. Um teste falha se um texto da app não tiver tradução nos dois idiomas, se as variáveis (`{n}`) não coincidirem ou se sobrar uma tradução que já não se usa. Por isso cada funcionalidade nova chega aos três idiomas ao mesmo tempo.
- As traduções foram escritas sem revisão por um tradutor nativo.
- A documentação do repositório continua em português e inglês.

### F22. Robustez e conforto no treino (v1.9 e v1.10)
Melhorias que saíram da revisão de 2026-10-26. F22.9 a F22.13 entraram na v1.10.
- **F22.1 A app nunca fica em branco.**
  - Um exercício do plano que o catálogo não conhece é retirado do plano mostrado, e aparece o aviso «N exercício(s) do teu plano deixaram de existir e foram retirados. Para os substituir, gera um plano novo em «Mais».». Pode acontecer por uma versão nova do catálogo, ou por uma cópia importada de uma versão mais recente.
  - Se um ecrã falhar por outro motivo, aparece «Algo correu mal», com «Exportar cópia (JSON)», «Recarregar» e os detalhes do erro. A cópia lê a base de dados diretamente, por isso funciona mesmo com o ecrã avariado.
- **F22.2 Um toque, uma gravação.** Enquanto uma série ou uma alteração ao exercício está a ser gravada, os botões «Concluir série», «Terminar exercício», «Saltar», «Desfazer», «Mais uma série» e apagar série ficam desativados. Um toque duplo grava uma só vez.
- **F22.3 Fim do descanso no iPhone.**
  - No fim do descanso tocam três bipes curtos. O som fica agendado quando o descanso começa e só toca com a app aberta e o telemóvel fora do modo silêncio. A vibração continua onde o navegador a suporta; o Safari do iPhone não a suporta.
  - Durante um treino a decorrer (aberto nas últimas 3 horas e não terminado), o ecrã fica ligado, onde o navegador o permite (iOS 16.4 ou mais recente). Continua a não haver notificações com a app fechada (F13).
- **F22.4 O descanso não se perde.** O temporizador de descanso aparece no topo de qualquer separador até terminar ou ser saltado; já não desaparece ao mudar de ecrã.
- **F22.5 Partilhar ficheiros no telemóvel.** Num ecrã tátil, a cópia de segurança e as exportações (PDF, Excel, CSV) abrem a folha de partilha do sistema: Ficheiros, iCloud Drive, email. Se o navegador não partilhar ficheiros ou recusar, o ficheiro é descarregado como antes. Cancelar a partilha não descarrega nada.
- **F22.6 Contraste e acessibilidade.**
  - No modo escuro, o azul de destaque passa a azul claro com texto escuro por cima (7:1). O verde de «feito» e de «Descanso terminado» passa a ter texto escuro.
  - As bordas das caixas de texto e listas passam a ter pelo menos 3:1.
  - Os botões reagem ao toque (ficam mais claros), sem movimento quando o sistema pede menos movimento.
  - O foco do teclado tem contorno visível.
  - As janelas de vídeo e de foto usam `<dialog>`: o resto da app fica inerte, Esc fecha, e o foco volta ao botão que as abriu.
  - As barras de dor anunciam «N de 10».
- **F22.7 Verificações.**
  - Os testes ponta a ponta correm no iPhone simulado com o motor do Chrome e com o do Safari (WebKit).
  - O código passa no `oxlint` (regras de correção e de hooks do React; a regra que proíbe ler a data durante o desenho está desligada, porque a app mostra datas relativas a hoje).
  - A publicação no GitHub Pages só corre depois de o CI passar no ramo principal.
- **F22.8 Fotos à parte.** As fotos de avaliação só são lidas nos ecrãs que as mostram, e não a cada série gravada.
- **F22.9 Quilos ou libras.**
  - Em «Mais» (e no questionário inicial) escolhe-se «kg» ou «lb». Por omissão é «lb» num telemóvel em inglês dos Estados Unidos e «kg» nos restantes. A escolha fica só neste dispositivo.
  - Cargas e peso corporal aparecem e escrevem-se na unidade escolhida: registo de séries, sugestões, última vez, Relatórios, Medições, Início, Fotos, questionário, PDF e Excel. As medidas do corpo continuam em centímetros.
  - Os dados ficam sempre guardados em quilos, e a cópia de segurança e o CSV também. Mudar de unidade não altera nada do que está registado.
  - Em libras, a progressão (secção 4.1) usa incrementos de 5 lb onde o exercício sobe 2 ou 2,5 kg, 10 lb onde sobe 5 kg e 2,5 lb onde sobe 1 kg (sempre múltiplos de 2,5 lb, mínimo 2,5 lb). Com carga leve sobe metade, arredondada a 2,5 lb. A descida de 10% arredonda a 0,5 lb.
- **F22.10 Corrigir uma série.** Cada série registada tem «Corrigir» (✎): a linha passa a campos de carga, repetições (ou segundos) e RIR, com «Guardar» e «Cancelar». Os valores são validados como ao registar.
- **F22.11 Desfazer apagar.** Apagar uma série é imediato e mostra «Série N apagada.» com «Desfazer», que a repõe no mesmo lugar. A mensagem desaparece ao registar a série seguinte ou ao sair do exercício.
- **F22.12 Idiomas a pedido.** As traduções e os catálogos em inglês e espanhol só são carregados quando esse idioma está escolhido. Ficam guardados para funcionar offline como o resto da app.
- **F22.13 Ícones desenhados.** A barra de baixo usa ícones desenhados em linha (SVG) em vez de emojis, com o mesmo aspeto em qualquer telemóvel e na cor do texto do separador.

### F23. Reserva, descanso e ecrã na horizontal (v1.11)
Primeira fase do estudo de 2026-10-31.
- **F23.1 Reserva em segundos.** Nos exercícios medidos em tempo (prancha, prancha lateral, caminhada do agricultor), em vez do RIR regista-se a reserva: «+15», «+30», «+45», «+60» ou «+» (mais de 60 s), os segundos que ainda aguentarias. É opcional, como o RIR.
  - A ficha pede «reserva +15–30 s», e «+30–45 s» quando o RIR pedido começa em 3 (readaptação, descarga, gravidez, limitações).
  - Fica num campo próprio da série, separado do RIR. As cópias anteriores continuam válidas.
  - A tabela de séries, o PDF, o Excel e o CSV mostram a reserva em segundos. Os registos antigos destes exercícios mantêm o RIR, mostrado como «RIR N».
- **F23.2 RIR 0 é a falha.** Nos exercícios por repetições, o RIR continua 0, 1, 2, 3, 4 ou 5+, e o 0 aparece como «0 (falha)». A progressão continua a não subir a carga depois de uma série até à falha (secção 4.1).
- **F23.3 Descanso visível.** O temporizador de descanso e o do alongamento ficam fixos no fundo do ecrã, por cima da barra de baixo, e não por baixo da barra de estado do iPhone. O conteúdo ganha espaço em baixo para nada ficar tapado.
- **F23.4 Vertical e horizontal.** A app instalada roda com o telemóvel. Na horizontal, o conteúdo e a barra de baixo respeitam as margens do entalhe, o vídeo cabe na altura do ecrã e os botões mantêm o tamanho de toque.

### F24. Tipo de carga (v1.12)
Segunda fase do estudo de 2026-10-31. Cada exercício diz como se conta o peso, e o campo da carga di-lo no rótulo.
- **F24.1 Como se conta.** Pelo equipamento do catálogo: halteres «por halter» (rótulo «Carga (kg por halter)»); barra «total, com a barra» («Carga total (kg)»); máquina e cabo «o que marca a máquina» («Carga (kg na máquina)»); peso corporal sem carga. Os incrementos da progressão (secção 4) já seguiam esta convenção e não mudam.
- **F24.2 Exercícios com mais de um equipamento.** Quando o exercício admite mais de uma forma de contar (ex.: halteres ou máquina), o ecrã do exercício mostra «Como contas o peso?». A escolha fica guardada para esse exercício e vale nas sessões seguintes. Sem escolha, vale o primeiro equipamento do catálogo.
- **F24.3 Registos guardam a forma.** Cada exercício registado numa sessão guarda como se contou o peso. A sugestão de carga só compara sessões contadas da mesma forma. Os registos anteriores à v1.12 contam como a forma por omissão do exercício (nos halteres, o peso de um halter).
- **F24.4 Discos por lado.** Nos exercícios com barra, «Escrever discos por lado» troca o campo por «Discos por lado». A app soma a barra e mostra, por exemplo, «20 kg barra + 2 × 15 kg = 50 kg». Guarda-se sempre o total, para a progressão e os recordes compararem valores iguais. O peso da barra escolhe-se em «Mais»: 20, 15 ou 10 kg (45, 35 ou 25 lb em libras); 20 kg por omissão.
- **F24.5 Exportações e cópia.** O histórico em Excel e o CSV têm a coluna da forma de contar. A cópia de segurança leva as escolhas por exercício e o peso da barra; as cópias anteriores continuam válidas.

### F25. Dias de treino, calendário e PDF do dia, da semana e do mês (v1.13)
Terceira fase do estudo de 2026-10-31.
- **F25.1 Dias de treino.** Na anamnese, por baixo de «Dias por semana», escolho opcionalmente os dias da semana em que treino (seg a dom). Se escolher, têm de ser tantos como os dias por semana. Mudar os dias não gera um plano novo. As cópias anteriores continuam válidas.
- **F25.2 Previsão.** Com dias escolhidos, a rotação do plano é posta nesses dias a partir do próximo treino (F3). Se hoje é dia de treino e ainda não terminei um treino hoje, o próximo treino é o de hoje. Se treinar noutro dia, a previsão reajusta-se sozinha, porque parte sempre do último treino feito. Sem dias escolhidos, não há datas: aparece a lista «Próximos treinos» pela ordem da rotação.
- **F25.3 Calendário.** Em «Relatórios», o separador «Calendário» mostra o mês, com os meses anterior e seguinte. Cada dia marca o treino feito (✓), o treino previsto (nome curto), o dia de hoje e as semanas de descarga. Tocar num dia mostra:
  - dia passado ou hoje com treino feito: o treino, os exercícios com todas as séries (carga, repetições, RIR ou reserva), a dor, a duração e o alongamento;
  - hoje por fazer ou a meio: o que falta, com o botão para continuar o treino;
  - dia seguinte com treino previsto: o treino tal como será nessa semana (séries × faixa, RIR, descanso).
- **F25.4 PDF do dia, da semana e do mês.** Em «Mais» e no calendário. Saem no idioma da app.
  - Dia: o treino de hoje (ou o próximo), com séries × faixa, RIR ou reserva, descanso, a sugestão de carga, a última vez e espaços em branco para escrever carga e repetições à mão.
  - Semana: os próximos 7 dias com datas (com dias escolhidos) ou os próximos treinos da rotação (sem dias), com espaços para escrever. Só o primeiro treino de cada exercício leva sugestão de carga, porque as seguintes dependem do que fizer.
  - Mês: 4 semanas a partir desta, com a fase de cada uma (readaptação, bloco e semana, descarga), os treinos e os exercícios, e as trocas de exercício quando começa um bloco novo. Sem cargas.

### F26. Exercícios personalizados (v1.14)
Quarta fase do estudo de 2026-10-31 (entrega A do plano próprio).
- **F26.1 Criar e editar.** Em «Mais», «Os meus exercícios» lista os exercícios que criei e tem «Novo exercício». Cada exercício tem:
  - obrigatórios: nome, medida (repetições ou segundos), como se conta o peso (por halter, total com a barra, o que marca a máquina, ou só o corpo) e grupo muscular principal;
  - opcionais: grupos secundários, incremento de carga, «Como fazer» (um ponto por linha) e link do vídeo (YouTube ou Vimeo, como na F22).
  - O incremento por omissão vem da forma de contar: 2 kg por halter, 2,5 kg no total ou na máquina, nenhum só com o corpo.
  - Não são traduzidos: ficam como os escrevi, em qualquer idioma da app.
- **F26.2 Onde entram.** Juntam-se ao catálogo: o ecrã do exercício, a sugestão de carga (secção 4), o volume semanal (o grupo principal conta 1 série, os secundários 0,5), o desenho dos músculos, os alongamentos do treino, o histórico e as exportações tratam-nos como os do catálogo. O plano gerado pelas regras (secção 3) nunca os escolhe.
- **F26.3 Usar no treino.** Em «Substituir exercício» aparecem também os meus exercícios com o mesmo grupo principal e a mesma medida. No plano próprio (F27) também se podem escolher.
- **F26.4 Apagar.** Um exercício sem registos é apagado. Um exercício com registos é arquivado, depois de confirmar: sai da lista e de «Substituir exercício», mas o histórico, os relatórios e as exportações continuam a mostrar o nome. Se já tiver registos, a medida não pode mudar, para não misturar repetições com segundos.
- **F26.5 Cópia.** Os exercícios personalizados entram na cópia de segurança (F10). As cópias anteriores continuam válidas.

### F27. Plano próprio (v1.15)
Quinta fase do estudo de 2026-10-31 (entrega B).
- **F27.1 Criar.** Em «Mais», «Criar o meu plano» abre o editor com o plano atual como ponto de partida: os mesmos treinos e exercícios (os do bloco atual), séries, faixa, RIR e descanso. Num plano próprio, o botão é «Editar o meu plano».
- **F27.2 Editar.** Posso mudar o nome e a ordem dos treinos, juntar treinos (até 7) e apagá-los, e em cada treino juntar exercícios do catálogo ou meus (F26), mudar a ordem, apagá-los e mudar séries (1–10), faixa de repetições ou segundos, RIR (0–5) e descanso. Um exercício acabado de juntar vem com os valores das regras do meu objetivo (secção 3.2): 3 séries, a faixa e o RIR do composto ou isolado e o descanso. Cada treino precisa de nome e de pelo menos um exercício (até 20).
- **F27.3 Readaptação e descarga.** Vêm ligadas por omissão: 2 semanas de readaptação (2 séries, RIR 3–4) e uma semana de descarga no fim de cada bloco (metade das séries, RIR 3–4), com o bloco do meu objetivo. Posso escolher 0 a 4 semanas de readaptação, desligar a descarga e escolher blocos de 3 a 8 semanas. Guardar mantém a contagem das semanas e a rotação dos treinos; com «Recomeçar a contagem hoje», a readaptação e os blocos contam a partir de hoje.
- **F27.4 Diferenças em relação ao plano gerado.** Não há troca de exercícios entre blocos. Os nomes ficam como os escrevi, em qualquer idioma. Os avisos da anamnese (PAR-Q+, gravidez, dor nunca avaliada) continuam, sem dizer que o plano é conservador. Ao juntar um exercício que as regras evitariam (dor, gravidez, equipamento), o editor mostra o motivo, mas deixa escolher. Gerar um plano novo a partir da anamnese substitui o plano próprio, depois de confirmar.
- **F27.5 Exercícios próprios no plano.** Apagar um exercício próprio que está no plano arquiva-o (F26.4), para o plano continuar a funcionar.

### F28. Lista de equipamento (v1.17)
Segunda fase do estudo de viabilidade de calistenia e treino em casa (2026-10-31).
- **F28.1 Lista.** Na anamnese, «Que equipamento tens» é uma lista: barra com discos e suporte, halteres, barra fixa, paralelas ou argolas, máquinas de musculação, polias (cabos), elásticos de resistência e caneleiras. O peso do corpo conta sempre. Os atalhos «Ginásio completo» e «Só o peso do corpo» marcam e desmarcam tudo. Numa anamnese nova vem tudo marcado.
- **F28.2 Halter mais pesado.** Com halteres, posso indicar o halter mais pesado que tenho (opcional, na unidade escolhida). Quando a sugestão (secção 4) subiria a carga acima dele, mantém a carga e sugere descer em 3 s em cada repetição ou fazer o exercício com uma perna ou um braço de cada vez.
- **F28.3 Respostas antigas.** Uma anamnese sem lista vale: ginásio completo = tudo; só halteres = halteres; casa = nada. O plano gerado é o mesmo antes e depois da conversão, e a anamnese abre com a lista marcada. O campo antigo continua a ser guardado como resumo (máquinas ou polias = ginásio; senão halteres = halteres; senão casa).
- **F28.4 Plano.** O plano usa só exercícios com pelo menos um equipamento marcado ou o peso do corpo (secção 3.4). Entram exercícios com elásticos (puxada, face pull, curl de bíceps) e com caneleiras (abdução da anca deitado de lado, coice de glúteo de quatro apoios), como últimos substitutos dos de ginásio. Com caneleiras e elásticos não se regista carga: progride-se pelas repetições e, no topo da faixa, com uma caneleira ou um elástico mais forte.
- **F28.5 Avisos.** Sem barra fixa, halteres, elásticos nem polias: aviso de costas e bíceps (secção 3.9). Sem barra com discos nem máquinas e com objetivo força: aviso de força.
- **F28.6 Cópia.** A cópia de segurança guarda a lista e o halter mais pesado; equipamento desconhecido é rejeitado.

### F29. Modo férias (v1.18)
Terceira fase do estudo de viabilidade de calistenia e treino em casa (2026-10-31): manter o treino fora do ginásio, em casa ou ao ar livre, sem perder o plano.
- **F29.1 Marcar.** Em «Mais», «Modo férias» › «Marcar férias»: data de início (hoje ou depois), data de fim (igual ou posterior) e o equipamento que vou ter, com a mesma lista da F28 (por omissão, só o peso do corpo). Dura no máximo 8 semanas; para mais tempo, a app sugere gerar um plano novo. Fica ativo do início ao fim, inclusive.
- **F29.2 Adaptar.** Enquanto está ativo, cada exercício do treino (já com a rotação do bloco atual) que não se pode fazer com o equipamento das férias passa ao primeiro compatível: substitutos do catálogo, depois exercícios do mesmo grupo e tipo, depois do mesmo grupo, sem repetir no treino e com as mesmas regras de restrições e gravidez. As séries e o RIR mantêm-se; um exercício trocado (ou que deixa de ter carga) usa a faixa de peso corporal (secção 3.9) ou a do catálogo, e a nota diz «Férias: substitui «…»». Uma posição sem alternativa sai do treino, com aviso. O plano guardado não muda: os registos ficam na mesma posição do treino, com o exercício que se fez, e a progressão de cada exercício continua pelo seu histórico.
- **F29.3 Durante.** «Hoje», «Início», o calendário, os PDF e «Substituir exercício» usam o plano adaptado. O primeiro aviso do plano diz até quando dura. Editar o plano próprio (F27) parte sempre do plano guardado.
- **F29.4 Terminar.** No fim da data, ou com «Terminar férias» (ou «Cancelar férias», se ainda não começou), o plano volta ao normal. A cópia de segurança guarda as férias marcadas.

### F30. Progressão por variação (v1.19)
Quarta fase do estudo de viabilidade de calistenia e treino em casa (2026-10-31): nos exercícios de peso corporal, progride-se para uma variação mais difícil em vez de subir quilos.
- **F30.1 Escadas.** Alguns exercícios estão numa escada de variações, da mais fácil para a mais difícil. A lista completa está na F31.2 (v1.20); na v1.19 eram cinco escadas mais curtas.
- **F30.2 Degrau atual.** Quando o exercício é feito sem carga (ou com peso extra, F30.6), o ecrã do exercício mostra «Escada «Flexões»: degrau 2 de 4» e os botões «Mais fácil: …» e «Mais difícil: …». Os degraus que não posso fazer (restrições, gravidez ou equipamento, incluindo o das férias) são saltados. A mudança fica guardada: a partir daí, em todos os treinos e planos, esse exercício do plano aparece na variação escolhida, com a nota «Variação atual (o plano tinha «…»).». O plano guardado não muda, e editar o plano próprio parte dele. Se já registei séries nesse exercício hoje, a app pede confirmação, porque mudar apaga-as.
- **F30.3 Subir.** A sugestão (secção 4, regra 8) diz quando passar ao degrau seguinte e mostra o botão «Passar para «…»». Nada muda sem eu tocar no botão.
- **F30.4 Transição suave.** Na primeira sessão de um degrau a que subi, a sugestão diz para fazer a 1.ª série na variação nova e, se não chegar ao mínimo da faixa, as restantes na anterior.
- **F30.5 Descer.** Abaixo do mínimo da faixa em 2 sessões seguidas, a sugestão é voltar ao degrau anterior, com o botão «Voltar a «…»». Sem degrau anterior, sugere uma variação mais fácil ou menos amplitude (nunca «baixa a carga» num exercício sem carga).
- **F30.6 Peso extra.** Nos exercícios compostos de peso corporal contados em repetições, «Como contas o peso?» tem «Só o corpo» (por omissão) e «Peso extra (colete ou mochila)», com o rótulo «Peso extra ({u})». No último degrau de uma escada, quando subiria, a sugestão é acrescentar peso extra. Com peso extra vale a dupla progressão (secção 4) com incremento de 2,5 kg (5 lb).
- **F30.7 Forma por omissão.** Num exercício que se pode fazer com carga ou sem ela (ex.: afundos), sem escolha guardada, vale a primeira forma cujo equipamento tenho (contando com as férias); sem nenhum, «Só o corpo». Os registos anteriores à v1.12 continuam a contar como na F24.3.
- **F30.8 Cópia.** A cópia de segurança guarda o degrau de cada exercício; as cópias anteriores continuam válidas.

### F31. Calistenia (v1.20)
Quinta fase do estudo de viabilidade de calistenia e treino em casa (2026-10-31).
- **F31.1 Níveis.** Os exercícios de calistenia têm um nível de dificuldade geral: Base, Intermédio, Avançado e Competência (as competências de longo prazo, como pino, front lever, planche e muscle-up, e os degraus mais difíceis de cada escada). O nível é uma orientação, não um diagnóstico: não existe uma escala científica validada.
- **F31.2 Escadas.** Flexões (na parede › inclinadas › de joelhos › flexões › declinadas › diamante › arqueiro › pseudo-planche › a um braço); Empurrar na vertical (pike › pike com pés elevados › negativas em pino na parede › flexões em pino na parede); Mergulhos (no banco › negativos › nas paralelas); Puxar na vertical (suspensão ativa › negativas › elevações › elevações ao peito › arqueiro › muscle-up › a um braço); Puxar na horizontal (remada invertida alta › remada invertida › com pés elevados › arqueiro); Pernas, joelho (agachamento › afundo à retaguarda › búlgaro › pistol com apoio › pistol para uma caixa › pistol › agachamento camarão); Pernas, anca (ponte › ponte a uma perna › hip thrust a uma perna); Posteriores (curl deslizante › nórdico negativo › nórdico); Core (dead bug › hollow com pernas fletidas › hollow › L-sit encolhido › L-sit › V-sit); Core na barra (joelhos ao peito › pernas estendidas › pés à barra); Dragon flag (elevação de pernas › dragon flag negativo › dragon flag); Pino (de costas para a parede › de frente para a parede › livre); Front lever (encolhido › encolhido avançado › a uma perna › completo); Back lever (skin the cat › encolhido › completo); Planche (inclinação › encolhida › encolhida avançada › pernas afastadas › completa). A bandeira humana fica de fora porque precisa de um poste vertical, que não está na lista de equipamento.
- **F31.3 Músculos em três níveis.** Cada exercício tem o grupo principal, os auxiliares 1 e, quando faz sentido, os auxiliares 2. O desenho do corpo mostra-os com três intensidades da mesma cor (principal mais forte), com legenda «Principal · Auxiliar 1 · Auxiliar 2». A descrição para leitores de ecrã diz os três níveis.
- **F31.4 Ecrã «Calistenia».** Em «Mais», «Calistenia: exercícios por nível» mostra os exercícios agrupados por nível e, dentro de cada um, pela escada, com o degrau («Flexões, degrau 4 de 9»). Cada exercício abre o desenho dos músculos, o objetivo, os pontos-chave, os cuidados e o vídeo (o meu, se o mudei, ou o do catálogo; sem vídeo, «Procurar no YouTube»). O ecrã do exercício mostra o nível.
- **F31.5 Plano de calistenia.** Na anamnese, «Tipo de treino»: «Musculação» (por omissão) ou «Calistenia». A calistenia usa modelos próprios: 2–3 dias, corpo inteiro A/B/C; 4 dias, superior e inferior A e B; 5 dias, mais corpo inteiro A; 6 dias, mais corpo inteiro A e B; 7 dias, mais recuperação ativa. A escolha de modelo e a ênfase não se aplicam. Cada posição é um padrão de movimento e começa num degrau pela experiência: iniciante e regresso no degrau de base, intermédio num degrau intermédio. As faixas são 6–15 reps nos compostos (4–8 com objetivo força) e 10–20 nos isolados, salvo a faixa própria do exercício. Restrições, gravidez e equipamento valem como na secção 3.4; sem barra fixa, as posições de puxar passam aos substitutos. O plano de calistenia é gerado de novo com a anamnese, como o de musculação.
- **F31.6 Competências.** Com calistenia, «Incluir competências (pino, front lever, planche)» acrescenta no início de cada treino de corpo inteiro e superior um exercício de competência, no primeiro degrau da sua escada, com 3 séries. Fica desligado por omissão.
- **F31.7 Aviso.** Em letra pequena, no fim do ecrã do exercício, no ecrã «Calistenia» e na anamnese quando a calistenia está escolhida: «As sugestões de exercícios e progressões desta app são de carácter geral e não substituem a orientação de um profissional qualificado. Recomenda-se o acompanhamento por um profissional especializado para aprender e consolidar a técnica de cada exercício. O programador e os responsáveis pela app não assumem responsabilidade por lesões ou danos resultantes da execução incorreta ou inadequada dos exercícios.»
- **F31.8 Vídeos.** Os exercícios novos têm um vídeo público escolhido por pesquisa, quando foi encontrado um que corresponde ao exercício; posso sempre trocar o vídeo (F5). A cópia de segurança guarda o tipo de treino e as competências.

### F32. Teste de nivelamento e fase por padrão (v1.21)

- **F32.1 Padrões testados.** Seis padrões de movimento, cada um numa escada da F31.2 e com uma variação de referência: Empurrar (flexões), Puxar na vertical (elevações), Puxar na horizontal (remada invertida), Pernas, joelho (agachamento búlgaro), Pernas, anca (ponte a uma perna) e Core (hollow, em segundos). Só contam os degraus que posso fazer com o meu equipamento e as minhas restrições; se a referência não for possível, a referência é o degrau possível mais alto abaixo dela; sem nenhum, o padrão fica de fora. Um padrão que não está no meu plano também fica de fora.
- **F32.2 Teste opcional.** Em «Mais» › «Teste de nivelamento (opcional)», e no ecrã «Hoje» enquanto o plano de calistenia não tem treinos registados nem teste. Leva 10–15 minutos: aquecer, uma série por padrão com o máximo de repetições limpas (ou segundos), parando quando só faltaria 1, e 2–3 minutos de descanso entre padrões. Posso saltar qualquer padrão. Com «sim» no PAR-Q+ ou gravidez, o ecrã recomenda falar com o médico antes. Sem teste, o plano começa nos degraus da F31.5 e ajusta-se com a regra 8 da secção 4. O aviso da F31.7 aparece no fim.
- **F32.3 Colocação.** A faixa de cada variação é a do plano (F31.5). Na referência: no topo da faixa ou acima, fico um degrau acima (nunca mais do que um, por segurança); dentro da faixa, fico na referência; abaixo do mínimo, a app pede uma segunda série no degrau abaixo. Nessa segunda série: com o mínimo, fico nesse degrau; abaixo, fico no degrau a seguir para baixo (ou no primeiro).
- **F32.4 Aplicar ao plano.** «Aplicar ao plano» muda o degrau (F30.2) dos exercícios do plano que estão na escada de cada padrão: o mais alto passa para o degrau do teste e os outros sobem ou descem o mesmo número de degraus, sem sair da escada. Os dias no degrau (regra 8) contam a partir da data do teste. O plano guardado não muda e o teste fica guardado (data e resultados).
- **F32.5 Fase por padrão.** Em «Relatórios» › «Degraus», um cartão com os seis padrões: o exercício atual, o nível (F31.1), «degrau n de total» e o que falta para o seguinte (topo da faixa em todas as séries em 2 sessões seguidas e pelo menos 14 dias no degrau, com os dias que faltam). O nível geral é o do padrão mais fraco (nível mais baixo; em empate, o que está mais abaixo na escada), assinalado como prioridade. O nível é uma orientação, não um diagnóstico.
- **F32.6 Linha temporal de degraus.** No mesmo separador, para cada padrão com treinos registados, um gráfico com o degrau mais alto feito em cada sessão e a lista das mudanças de degrau, com a data.
- **F32.7 Repetir o teste.** Quando passou um bloco (F14) desde o último teste, o cartão da fase e o ecrã «Hoje» (com calistenia) propõem repeti-lo. A cópia de segurança guarda o último teste.

### F33. Revisão de UI (v1.22)

- **F33.1 Ecrã do exercício.** Logo a seguir ao nome vêm a sugestão de hoje, as séries registadas e o cartão «Série n de m», para registar sem deslizar. O desenho dos músculos, o objetivo, os pontos-chave, os cuidados e o vídeo ficam em «Músculos, técnica e vídeo», que vem aberto enquanto não há registos do exercício e fechado depois. A escada (F30.2) fica antes desse bloco.
- **F33.2 Barra de baixo com 5 separadores.** «Fotos» deixa de ter separador próprio e passa para dentro de «Medições», com dois botões no topo: «Medidas» e «Fotos». O endereço das fotos mantém-se. Em inglês, o separador chama-se «Body» e, em espanhol, «Cuerpo», para não repetir o nome do botão «Medidas».
- **F33.3 Conquistas no Início.** Aparecem as conquistas obtidas e as 3 seguintes por obter; as restantes ficam em «Ver todas (n)».

### F34. Reportar ou sugerir (v1.23)

- **F34.1 Onde.** Em «Mais», «Reportar ou sugerir». No ecrã do exercício, um botão pequeno «Reportar um problema neste exercício». No treino de hoje, um botão pequeno «Reportar um problema neste treino». Os botões abrem o mesmo ecrã com o exercício ou o treino já indicado.
- **F34.2 Motivos.** Exercício: vídeo incorreto, vídeo pouco explicativo, instrução pouco clara, exercício desadequado para mim, outro. Treino: instrução pouco clara, duração ou volume desadequado, exercício em falta ou a mais, outro. Geral: sugestão, erro na app, tradução incorreta, outro. Escolher um motivo é obrigatório. A descrição é obrigatória em «outro», «sugestão» e «erro na app», e tem no máximo 1000 caracteres. Um email para resposta é opcional e, se preenchido, tem de ser válido.
- **F34.3 O que é enviado.** Só o motivo, a descrição, o email de resposta (se preenchido), o exercício ou o treino (id e nome), o link do vídeo atual nos motivos de vídeo, a versão da app e o idioma. Nunca a anamnese, as medições, as fotos, os registos de treino nem o nome do perfil. O ecrã diz isto antes de enviar.
- **F34.4 Envio sem mostrar o destino.** O botão «Enviar» manda o reporte por HTTPS a um serviço de formulários (Web3Forms), que o reencaminha por email. A app só tem uma chave de acesso pública; o endereço de destino está guardado no serviço e não aparece na app nem no repositório. Inclui um campo escondido contra robôs. Depois de enviar, aparece uma confirmação e o formulário fica limpo; há um intervalo mínimo de 60 s entre envios. Sem rede ou com erro do serviço, aparece um aviso e o texto mantém-se para tentar de novo. Enquanto não houver chave configurada, o ecrã diz que os reportes ainda não estão ativos e o botão fica desativado.

### F14. Blocos e próxima mudança (v1.2, regras na secção 3.7)
- No Início e no Treino de hoje: fase atual (readaptação, semana N de M do bloco, ou descarga) e a próxima mudança com data: fim da readaptação (séries completas), semana de descarga (metade das séries), ou novo bloco (troca dos exercícios isolados, com a lista do que muda).

## 3. Regras de geração do plano (v1)

### 3.1 Divisão
| Dias/semana | Divisão |
|---|---|
| 2–3 | Corpo inteiro A/B(/C) |
| 4 | Superior A, Inferior A, Superior B, Inferior B |
| 5 | Superior/Inferior + Corpo inteiro |
| 6 (v1.2) | Empurrar A, Puxar A, Pernas A, Empurrar B, Puxar B, Pernas B (A/B/C duas vezes) |
| 7 (v1.2) | Os 6 dias + Recuperação ativa (caminhada leve 20 min e core leve, 2 séries com RIR 3–4) |

Com 3 dias usa-se Corpo inteiro A/B/C e não Empurrar/Puxar/Pernas, porque com essa divisão cada músculo seria treinado só 1 vez por semana. Com 7 dias, o sétimo é sempre de recuperação: treinar força 7 dias seguidos não é recomendável, sobretudo a regressar após paragem.

Frequência alvo: cada grupo principal 2×/semana.

**Escolha do modelo de treino (v1.5).** Na anamnese escolho o modelo; só aparecem as combinações coerentes com os dias por semana:

| Modelo | Dias | Treinos (em rotação) |
|---|---|---|
| Automático (recomendado) | 2–7 | Tabela acima |
| Corpo inteiro | 2–4 | Corpo inteiro A, B (2 dias) ou A, B, C (3–4 dias) |
| A/B: superior e inferior | 2–6 | Superior A, Inferior A (2 dias) ou Superior A, Inferior A, Superior B, Inferior B |
| A/B/C: empurrar, puxar, pernas | 3–7 | Empurrar, Puxar e Pernas A e B; com 7 dias, mais Recuperação ativa |
| Por grupo muscular | 4–6 | Peito e tríceps, Costas e bíceps, Pernas A, Ombros e core; com 5–6 dias, mais Pernas B |

- Combinações com frequência de 1×/semana por grupo (A/B com 2 dias, A/B/C com 3 dias, Por grupo muscular) são permitidas, com um aviso no plano: a evidência favorece 2×/semana (Schoenfeld et al., 2016).
- Uma combinação incoerente (ex.: guardada antes de mudar os dias) gera o modelo automático, com aviso.

### 3.2 Parâmetros por objetivo
| Objetivo | Compostos | Isolados | RIR | Descanso compostos / isolados |
|---|---|---|---|---|
| Recomposição / hipertrofia | 6–10 reps | 10–15 reps | 1–3 | 2 min / 60 s |
| Força | 3–6 reps | 8–12 reps | 1–2 | 3 min / 90 s |
| Saúde geral | 8–12 reps | 12–15 reps | 2–3 | 90 s / 60 s |

### 3.3 Volume semanal
- Alvo: 8–14 séries por grupo grande (peito, costas, quadríceps, posteriores, glúteos), 6–10 por grupo pequeno (ombros, bíceps, tríceps, gémeos, core). O exercício principal conta 1 série; os grupos secundários contam 0,5.
- O primeiro composto de cada grupo grande em cada treino tem 4 séries; os restantes 3.
- Nota (v1.1): o alvo mínimo passou de 10 para 8 porque, com 60 min e 4 dias, 10 séries diretas de peito não cabem sem cortar outros grupos. 8+ séries semanais continuam na faixa com bons resultados (Schoenfeld et al., 2017).
- Fase de readaptação (experiência "regresso" ou "iniciante"): semanas 1–2 com 2 séries por exercício e RIR 3–4; a partir da semana 3, parâmetros normais.

### 3.4 Restrições
- Cada exercício tem contraindicações (ex.: `ombro`) e substitutos ordenados.
- Exercício contraindicado é trocado pelo primeiro substituto sem a mesma contraindicação; se não houver, o exercício é removido e o volume do grupo é redistribuído.
- Reintrodução (**por implementar**): um exercício evitado só é sugerido de novo depois de 4 sessões seguidas com dor ≤ 2 no substituto, e sempre como opção, nunca automaticamente. Na v1 pode ser trocado à mão em «Substituir exercício».

### 3.4.1 Sexo, gravidez e pós-parto (v1.3)
- O plano base não muda com o sexo. Com o mesmo treino, homens e mulheres ganham força e massa muscular em proporção semelhante (Roberts et al., 2020); dar automaticamente mais pernas a mulheres e mais tronco a homens não tem base sólida. A diferença fica na ênfase, escolhida por cada pessoa (secção 3.8).
- Gravidez ou pós-parto: plano conservador (RIR 3–4) e aviso (ACOG, 2020). No 2.º e 3.º trimestres, os exercícios marcados no catálogo como deitado de costas ou de barriga para baixo (`deitado`) são trocados pelo primeiro substituto compatível, com a nota «por causa da gravidez».

### 3.5 Duração
- Estimativa por série: 45 s de execução + descanso prescrito. Aquecimento: 8 min. Cardio opcional: 10–15 min no fim dos dias de inferiores.
- Se o treino exceder a duração, remove-se primeiro o último isolado, depois reduz-se 1 série nos isolados.

### 3.6 Cardio
- Se aceite: 10–15 min de intensidade moderada (consegue falar frases curtas) no fim de 2 sessões por semana.

### 3.7 Blocos, descarga e rotação de exercícios (v1.2)
- Duração do bloco por objetivo: força 4 semanas (3 + descarga); recomposição e hipertrofia 5 semanas (4 + descarga); saúde geral 6 semanas (5 + descarga). Fica guardada no plano (`semanasBloco`).
- As semanas contam a partir da criação do plano. Se houver readaptação, as semanas 1–2 são de readaptação e o primeiro bloco começa na semana 3.
- Descarga (última semana de cada bloco): séries = metade arredondada para cima, RIR 3–4, a carga mantém-se (não sobe).
- Rotação: no início de cada bloco, os exercícios isolados passam para a alternativa seguinte compatível (substitutos do catálogo, mesmas regras de restrição e equipamento, sem repetir exercícios no treino). Os compostos mantêm-se, para se ver a progressão. As alternativas ficam guardadas na prescrição (`alternativas`), e o bloco n usa a alternativa n módulo o número de alternativas.

### 3.8 Ênfase (v1.3)
- Equilibrado: sem alterações.
- Mais pernas e glúteos: compostos de quadríceps, posteriores e glúteos ganham 1 série (máximo 5); isolados de tronco e braços perdem 1 série (mínimo 2).
- Mais tronco: o inverso (compostos de peito e costas +1 série; isolados de pernas e gémeos −1 série).
- Depois aplica-se o ajuste de duração (secção 3.5).

### 3.9 Treino em casa (v1.16)
Primeira fase do estudo de viabilidade de calistenia e treino em casa (2026-10-31). Antes, o equipamento «casa» gerava treinos com 1 ou 2 exercícios, porque os substitutos do catálogo eram quase todos de ginásio.
- **Equipamento.** «Barra» é a barra com discos. As elevações pedem barra fixa (`barra-fixa`), os mergulhos nas paralelas pedem paralelas (`paralelas`) e a remada invertida pede barra fixa ou barra num suporte. O ginásio tem tudo; «Só halteres» e «Em casa, sem equipamento» não têm nenhum destes. Desde a v1.17, cada pessoa marca o que tem (F28).
- **Exercícios de casa.** Entram no catálogo: flexões declinadas, flexões diamante, flexões pike, remada unilateral com mochila, elevação em Y deitado de barriga, curl de pernas deslizante (toalha) e cadeira na parede. O peso morto romeno unilateral passa a poder fazer-se sem halter. Os exercícios de ginásio ganham estes como últimos substitutos, por isso a escolha no ginásio não muda.
- **Faixa de peso corporal.** Um exercício feito só com o peso do corpo (sem carga possível, ou sem o equipamento de carga disponível) usa 8–20 reps nos compostos e 12–25 nos isolados, em qualquer objetivo, porque com pouca carga o estímulo vem de chegar perto da falha (Schoenfeld et al., 2017). A faixa própria do catálogo continua a mandar (ex.: prancha 30–60 s, flexões pike 6–15).
- **Avisos.** Em casa sem equipamento: costas e bíceps ficam com pouco trabalho, e uma barra fixa ou halteres fazem a maior diferença. Sem ginásio e com objetivo força: o objetivo fica limitado sem cargas pesadas.

## 4. Regras de progressão (dupla progressão)

Para cada Prescrição com faixa [mín, máx]:
1. Se todas as séries da última sessão chegaram a máx reps com RIR ≥ 1: sobe a carga pelo incremento do exercício (barra inferiores 5 kg; barra superiores 2,5 kg; halteres 2 kg; máquina 1 placa ou 2,5 kg) e volta a mín reps. (v1.3) Se o incremento for mais de 10% da carga atual, sobe metade do incremento (arredondado a 0,25 kg, mínimo 1 kg). Ex.: halter de 6 kg sobe 1 kg e não 2 kg. Isto ajuda sobretudo quem usa cargas mais leves. Em libras, ver F22.9.
2. Senão: mantém a carga e tenta +1 rep na série mais baixa.
3. Se ficou abaixo de mín reps em 2 sessões seguidas: baixa a carga 10%.
4. Dor ≥ 4: não sobe a carga e sugere substituto. Dor ≥ 7: recomenda parar o exercício hoje e mostra aviso para avaliação.
5. Fase de readaptação: sem subida de carga nas primeiras 2 sessões de cada exercício.
6. (v1.2) Semana de descarga: mantém a carga da última sessão, sem subida.
7. (v1.17) Com halteres e o halter mais pesado indicado (F28.2), a carga não sobe acima dele.
8. (v1.19) Exercício sem carga numa escada (F30): em vez da regra 1, passa ao degrau seguinte quando todas as séries chegaram a máx (reps ou segundos) com RIR ≥ 1 em **2 sessões seguidas** e está no degrau há pelo menos **14 dias** (contados desde a mudança de degrau ou, no degrau de origem, desde a primeira sessão registada). O salto entre variações é maior do que +2 kg, e tendões e punhos adaptam-se mais devagar do que o músculo. Se ainda falta uma sessão ou faltam dias, a sugestão diz quanto falta. Em vez da regra 3, desce um degrau. As regras 4 a 6 valem como estão. No último degrau, passa a peso extra (F30.6).

## 5. Requisitos não funcionais
- Funciona offline depois da primeira abertura.
- Abre em menos de 2 s num iPhone recente.
- Modo claro e escuro, alvos de toque ≥ 44 px, texto legível com o telemóvel no suporte da máquina.
- Cabe em ecrãs de 320 px de largura (iPhone SE) ou mais, nos três idiomas: nenhum elemento sai do ecrã e nenhum botão tem o texto cortado (v1.21.1).
- Sem analytics, sem rastreadores, sem chamadas de rede exceto vídeos e, na própria origem da app, o service worker e o ficheiro de novidades (F20). A única exceção que envia dados é o reporte (F34), só quando a pessoa carrega em «Enviar».

## 6. Segurança
- Content Security Policy: `default-src 'self'`; `connect-src 'self' https://api.web3forms.com` (v1.23, F34); `frame-src` só `https://www.youtube-nocookie.com` e `https://player.vimeo.com`; `img-src 'self' https://i.ytimg.com data: blob:` (v1.4: `blob:` para ler a foto escolhida antes de a recodificar).
- Links de vídeo aceites só de youtube.com, youtu.be, m.youtube.com, vimeo.com; convertidos em URL de incorporação.
- iframe com `sandbox="allow-scripts allow-same-origin allow-presentation"` e `referrerpolicy="strict-origin-when-cross-origin"`.
- Nenhum conteúdo de dados inserido como HTML.
- Importação validada por esquema (Zod). Fotos aceites só como `data:image/jpeg;base64,` e com tamanho limitado.
- (v1.4) Fotos recodificadas no dispositivo antes de gravar, o que remove metadados EXIF (incluindo GPS). Não saem do dispositivo exceto na cópia de segurança que a pessoa exporta.
- Integração contínua: typecheck, `oxlint`, testes de unidade e ponta a ponta (Chromium e WebKit), `npm audit`; a publicação só corre depois de o CI passar (v1.9); Dependabot ativo. A análise de segredos do GitHub aplica-se a repositórios públicos. Proteção do ramo principal: **por configurar**.
- Dados pessoais nunca entram no repositório: a anamnese é preenchida no telemóvel e os testes usam um perfil fictício. Por isso o repositório pode ser público.

## 7. Fora da v1
Sincronização entre dispositivos, notificações e lembretes (no iPhone exigem servidor; sem lembretes por decisão do utilizador), bloqueio de anúncios, Apple Health, vários utilizadores, IA, social.

## 8. Estrutura técnica
```
specs/            esta especificação (PT e EN)
docs/             análise de mercado e metodologia (PT e EN)
src/domain/       TypeScript puro: plano, progressão, relatórios (TDD, sem dependências de UI)
src/data/         IndexedDB via Dexie, exportação/importação
src/ui/           React
src/catalog/      exercicios.json e alongamentos.json (catálogos versionados)
src/novidades.json  novidades de cada versão e o que está em preparação (F20)
src/i18n/         traduções da interface em inglês e espanhol (F21)
tests/e2e/        Playwright: anamnese → plano → sessão → relatório
```
Regra: cada critério de aceitação da secção 2 tem pelo menos um teste com o seu código (ex.: `F4`, `3.2`).

Documentação: toda a documentação do repositório existe em português e em inglês; qualquer alteração atualiza as duas versões.

## 9. Exemplo de resultado das regras
Perfil fictício usado nos testes: recomposição, 4 dias, 60 min, ginásio completo, regresso após paragem, restrição de ombro, aceita cardio curto.

- **Superior A:** supino com halteres pega neutra, remada sentada no cabo, puxada à frente, elevações laterais leves, curl com halteres, extensão de tríceps na corda.
- **Inferior A:** leg press, peso morto romeno, curl de pernas deitado, elevação de gémeos, prancha; cardio 10 min.
- **Superior B:** supino em máquina convergente, remada unilateral com halter, puxada pega neutra, face pull, curl martelo, tríceps na polia.
- **Inferior B:** agachamento goblet, hip thrust, agachamento búlgaro, cadeira flexora, dead bug; cardio 10 min. (v1.1: a cadeira flexora substituiu a extensora para treinar os posteriores 2×/semana.)
- Semanas 1–2: 2 séries por exercício, RIR 3–4. Depois: 3 séries, RIR 1–3.
- (v1.2) Blocos de 5 semanas a partir da semana 3: semanas 3–6 de progressão, semana 7 de descarga; na semana 8 começa o bloco 2 e, por exemplo, o curl com halteres passa a curl martelo e a extensão na corda passa a tríceps na polia.

Os links de vídeo do catálogo podem ser substituídos na app por outros do YouTube ou Vimeo.
