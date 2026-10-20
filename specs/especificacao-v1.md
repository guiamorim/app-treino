# App de treino: especificação v1

Data: 2026-10-20 · Versão 1.1 (ajustes feitos durante a implementação, marcados com v1.1)

## 0. Decisões fechadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA instalada no ecrã inicial do iPhone; também abre em qualquer navegador |
| Dados | Só no dispositivo (IndexedDB), com exportação e importação de cópia de segurança. Sincronização fica fora da v1 (a resposta à pergunta 2 veio com as duas opções; assumi a recomendada) |
| Utilizadores | Um só, sem login |
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

## 2. Funcionalidades e critérios de aceitação

### F1. Anamnese
- Campos: idade, altura, peso, cintura, sexo, objetivo (recomposição, hipertrofia, força, saúde geral), dias por semana (2–5), duração da sessão (45/60/75 min), experiência (iniciante, regresso após paragem, intermédio), equipamento (ginásio completo, halteres, casa), restrições, aceita cardio (sim/não), PAR-Q+ (7 perguntas gerais).
- **Dado** que respondo "sim" a alguma pergunta do PAR-Q+, **quando** guardo, **então** vejo um aviso a recomendar avaliação médica antes de treinar, e o plano é gerado com intensidade conservadora e marcado como tal.
- **Dado** que indico uma restrição sem avaliação profissional, **então** a app mostra uma recomendação para avaliação, sem bloquear.
- **Quando** altero a anamnese, **então** a app pergunta se quero gerar um novo plano; o histórico mantém-se.

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

## 3. Regras de geração do plano (v1)

### 3.1 Divisão
| Dias/semana | Divisão |
|---|---|
| 2–3 | Corpo inteiro A/B(/C) |
| 4 | Superior A, Inferior A, Superior B, Inferior B |
| 5 | Superior/Inferior + Corpo inteiro |

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
- Reintrodução: um exercício evitado só é sugerido de novo depois de 4 sessões seguidas com dor ≤ 2 no substituto, e sempre como opção, nunca automaticamente.

### 3.5 Duração
- Estimativa por série: 45 s de execução + descanso prescrito. Aquecimento: 8 min. Cardio opcional: 10–15 min no fim dos dias de inferiores.
- Se o treino exceder a duração, remove-se primeiro o último isolado, depois reduz-se 1 série nos isolados.

### 3.6 Cardio
- Se aceite: 10–15 min de intensidade moderada (consegue falar frases curtas) no fim de 2 sessões por semana.

## 4. Regras de progressão (dupla progressão)

Para cada Prescrição com faixa [mín, máx]:
1. Se todas as séries da última sessão chegaram a máx reps com RIR ≥ 1: sobe a carga pelo incremento do exercício (barra inferiores 5 kg; barra superiores 2,5 kg; halteres 2 kg; máquina 1 placa ou 2,5 kg) e volta a mín reps.
2. Senão: mantém a carga e tenta +1 rep na série mais baixa.
3. Se ficou abaixo de mín reps em 2 sessões seguidas: baixa a carga 10%.
4. Dor ≥ 4: não sobe a carga e sugere substituto. Dor ≥ 7: recomenda parar o exercício hoje e mostra aviso para avaliação.
5. Fase de readaptação: sem subida de carga nas primeiras 2 sessões de cada exercício.

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
- Integração contínua: testes, lint, `npm audit`, Dependabot, análise de segredos; ramo principal protegido.
- Os teus dados nunca entram no repositório: a anamnese é preenchida no telemóvel. Por isso o repositório pode ser público sem expor nada pessoal.

## 7. Fora da v1
Sincronização entre dispositivos, notificações push, Apple Health, vários utilizadores, IA, social, calculadora de discos, deload automático.

## 8. Estrutura técnica
```
specs/            esta especificação, dividida por funcionalidade
src/domain/       TypeScript puro: plano, progressão, relatórios (TDD, sem dependências de UI)
src/data/         IndexedDB via Dexie, exportação/importação
src/ui/           React
catalog/          exercises.json (catálogo versionado)
tests/e2e/        Playwright: anamnese → plano → sessão → relatório
```
Regra: cada critério de aceitação da secção 2 tem pelo menos um teste com o seu código (ex.: `F4.3`).

## 9. Exemplo de resultado das regras
Perfil fictício usado nos testes: recomposição, 4 dias, 60 min, ginásio completo, regresso após paragem, restrição de ombro, aceita cardio curto.

- **Superior A:** supino com halteres pega neutra, remada sentada no cabo, puxada à frente, elevações laterais leves, curl com halteres, extensão de tríceps na corda.
- **Inferior A:** leg press, peso morto romeno, curl de pernas deitado, elevação de gémeos, prancha; cardio 10 min.
- **Superior B:** supino em máquina convergente, remada unilateral com halter, puxada pega neutra, face pull, curl martelo, tríceps na polia.
- **Inferior B:** agachamento goblet, hip thrust, agachamento búlgaro, cadeira flexora, dead bug; cardio 10 min. (v1.1: a cadeira flexora substituiu a extensora para treinar os posteriores 2×/semana.)
- Semanas 1–2: 2 séries por exercício, RIR 3–4. Depois: 3 séries, RIR 1–3.

Os links de vídeo do catálogo podem ser substituídos na app por outros do YouTube ou Vimeo.
