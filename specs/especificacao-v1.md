# App de treino: especificação v1

[English](specification-v1.en.md) · **Português**

Data: 2026-10-20 · Versão 1.3 (ajustes feitos durante a implementação marcados com v1.1; novas funcionalidades marcadas com v1.2 e v1.3)

## 0. Decisões fechadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA instalada no ecrã inicial do iPhone; também abre em qualquer navegador |
| Dados | Só no dispositivo (IndexedDB), com exportação e importação de cópia de segurança. Sincronização fica fora da v1 |
| Utilizadores | Um por dispositivo, sem login. Outras pessoas (homens ou mulheres) usam a app no seu próprio telemóvel; os dados não são partilhados (v1.3) |
| Plano | Gerado por regras determinísticas a partir da anamnese, sem IA |
| Restrições | Uma dor nunca avaliada gera recomendação de avaliação; exercícios contraindicados são substituídos |
| Língua | Português de Portugal |
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
| **Sugestão** | Carga e repetições propostas para a próxima Sessão (calculada, não guardada) |
| **Bloco** (v1.2) | Ciclo de semanas de progressão terminado por uma semana de descarga; a duração depende do objetivo |
| **Descarga** | Semana com metade das séries e RIR 3–4, para recuperar antes do bloco seguinte |
| **Conquista** (v1.2) | Marco calculado a partir do histórico (ex.: 10 treinos, 4 semanas seguidas cumpridas) |

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
- Lembretes: decisão do utilizador (2026-10-20): **sem lembretes**. Motivo técnico: no iPhone uma app web não consegue agendar notificações locais, e notificações push exigem um servidor, o que contraria «dados só no dispositivo». Alternativa avaliada e não adotada: ficheiro de calendário (.ics) com um lembrete diário, a uma hora fixa ou 15 a 20 min antes do horário habitual.

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
1. Se todas as séries da última sessão chegaram a máx reps com RIR ≥ 1: sobe a carga pelo incremento do exercício (barra inferiores 5 kg; barra superiores 2,5 kg; halteres 2 kg; máquina 1 placa ou 2,5 kg) e volta a mín reps. (v1.3) Se o incremento for mais de 10% da carga atual, sobe metade do incremento (arredondado a 0,25 kg, mínimo 1 kg). Ex.: halter de 6 kg sobe 1 kg e não 2 kg. Isto ajuda sobretudo quem usa cargas mais leves.
2. Senão: mantém a carga e tenta +1 rep na série mais baixa.
3. Se ficou abaixo de mín reps em 2 sessões seguidas: baixa a carga 10%.
4. Dor ≥ 4: não sobe a carga e sugere substituto. Dor ≥ 7: recomenda parar o exercício hoje e mostra aviso para avaliação.
5. Fase de readaptação: sem subida de carga nas primeiras 2 sessões de cada exercício.
6. (v1.2) Semana de descarga: mantém a carga da última sessão, sem subida.

## 5. Requisitos não funcionais
- Funciona offline depois da primeira abertura.
- Abre em menos de 2 s num iPhone recente.
- Modo claro e escuro, alvos de toque ≥ 44 px, texto legível com o telemóvel no suporte da máquina.
- Sem analytics, sem rastreadores, sem chamadas de rede exceto vídeos.

## 6. Segurança
- Content Security Policy: `default-src 'self'`; `frame-src` só `https://www.youtube-nocookie.com` e `https://player.vimeo.com`; `img-src 'self' https://i.ytimg.com data:`.
- Links de vídeo aceites só de youtube.com, youtu.be, m.youtube.com, vimeo.com; convertidos em URL de incorporação.
- iframe com `sandbox="allow-scripts allow-same-origin allow-presentation"` e `referrerpolicy="strict-origin-when-cross-origin"`.
- Nenhum conteúdo de dados inserido como HTML.
- Importação validada por esquema (Zod).
- Integração contínua: typecheck, testes de unidade e ponta a ponta, `npm audit`; Dependabot ativo. A análise de segredos do GitHub aplica-se a repositórios públicos. Proteção do ramo principal: **por configurar**.
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
src/catalog/      exercicios.json (catálogo versionado)
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
