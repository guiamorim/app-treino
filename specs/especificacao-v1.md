# App de treino: especificação v1

[English](specification-v1.en.md) · **Português**

Data: 2026-10-20 · Versão 1.9 (ajustes feitos durante a implementação marcados com v1.1; novas funcionalidades marcadas com v1.2 a v1.9)

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
- Campos: idade, altura, peso, cintura, sexo, objetivo (recomposição, hipertrofia, força, saúde geral), dias por semana (2–7), duração da sessão (45/60/75 min), experiência (iniciante, regresso após paragem, intermédio), equipamento (ginásio completo, halteres, casa), restrições (zonas com dor, ou «Nenhuma»), aceita cardio (sim/não), PAR-Q+ (7 perguntas gerais). (v1.3) Ênfase do plano (equilibrado, mais pernas e glúteos, mais tronco), para qualquer sexo. Se o sexo for feminino: gravidez ou pós-parto (não; grávida no 1.º trimestre; grávida no 2.º ou 3.º trimestre; pós-parto há menos de 12 meses).
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

### F22. Robustez e conforto no treino (v1.9)
Melhorias que saíram da revisão de 2026-10-26.
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

## 4. Regras de progressão (dupla progressão)

Para cada Prescrição com faixa [mín, máx]:
1. Se todas as séries da última sessão chegaram a máx reps com RIR ≥ 1: sobe a carga pelo incremento do exercício (barra inferiores 5 kg; barra superiores 2,5 kg; halteres 2 kg; máquina 1 placa ou 2,5 kg) e volta a mín reps. (v1.3) Se o incremento for mais de 10% da carga atual, sobe metade do incremento (arredondado a 0,25 kg, mínimo 1 kg). Ex.: halter de 6 kg sobe 1 kg e não 2 kg. Isto ajuda sobretudo quem usa cargas mais leves. Em libras, ver F22.9.
2. Senão: mantém a carga e tenta +1 rep na série mais baixa.
3. Se ficou abaixo de mín reps em 2 sessões seguidas: baixa a carga 10%.
4. Dor ≥ 4: não sobe a carga e sugere substituto. Dor ≥ 7: recomenda parar o exercício hoje e mostra aviso para avaliação.
5. Fase de readaptação: sem subida de carga nas primeiras 2 sessões de cada exercício.
6. (v1.2) Semana de descarga: mantém a carga da última sessão, sem subida.

## 5. Requisitos não funcionais
- Funciona offline depois da primeira abertura.
- Abre em menos de 2 s num iPhone recente.
- Modo claro e escuro, alvos de toque ≥ 44 px, texto legível com o telemóvel no suporte da máquina.
- Sem analytics, sem rastreadores, sem chamadas de rede exceto vídeos e, na própria origem da app, o service worker e o ficheiro de novidades (F20).

## 6. Segurança
- Content Security Policy: `default-src 'self'`; `frame-src` só `https://www.youtube-nocookie.com` e `https://player.vimeo.com`; `img-src 'self' https://i.ytimg.com data: blob:` (v1.4: `blob:` para ler a foto escolhida antes de a recodificar).
- Links de vídeo aceites só de youtube.com, youtu.be, m.youtube.com, vimeo.com; convertidos em URL de incorporação.
- iframe com `sandbox="allow-scripts allow-same-origin allow-presentation"` e `referrerpolicy="strict-origin-when-cross-origin"`.
- Nenhum conteúdo de dados inserido como HTML.
- Importação validada por esquema (Zod). Fotos aceites só como `data:image/jpeg;base64,` e com tamanho limitado.
- (v1.4) Fotos recodificadas no dispositivo antes de gravar, o que remove metadados EXIF (incluindo GPS). Não saem do dispositivo exceto na cópia de segurança que a pessoa exporta.
- Integração contínua: typecheck, `oxlint`, testes de unidade e ponta a ponta (Chromium e WebKit), `npm audit`; a publicação só corre depois de o CI passar (v1.9); Dependabot ativo. A análise de segredos do GitHub aplica-se a repositórios públicos. Proteção do ramo principal: **por configurar**.
- Dados pessoais nunca entram no repositório: a anamnese é preenchida no telemóvel e os testes usam um perfil fictício. Por isso o repositório pode ser público.

## 7. Fora da v1
Sincronização entre dispositivos, notificações e lembretes (no iPhone exigem servidor; sem lembretes por decisão do utilizador), bloqueio de anúncios, Apple Health, vários utilizadores, IA, social, calculadora de discos.

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
