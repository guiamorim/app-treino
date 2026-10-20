# App de treino: análise de mercado e metodologia

[English](analysis.en.md) · **Português**

Data: 2026-10-20. Análise feita antes da especificação; as decisões finais estão em [specs/especificacao-v1.md](../specs/especificacao-v1.md). Os dados pessoais do utilizador foram retirados desta versão pública.

## 1. Avaliação honesta do briefing

**O que está bem definido**
- Uso pessoal, no telemóvel, com acesso também pela web.
- Registo do que é feito em cada exercício, guardado para consulta.
- Lista do treino do dia com estado (feito / por fazer / treino completo).
- Por exercício: grupo muscular principal, vídeo de demonstração e síntese do objetivo.
- Plano gerado a partir de objetivo + anamnese.
- 1 ou 2 relatórios com indicadores práticos.

**O que falta ou está ambíguo**
1. **O que se regista por série.** Sem isto não há relatórios úteis. Proposta: carga, repetições e RIR (repetições que ainda se conseguiriam fazer) por série, mais um campo opcional de dor/desconforto (0–10).
2. **Como o plano progride.** O briefing fala em gerar o plano, mas não em ajustá-lo. A parte mais útil das apps de mercado é dizer "hoje tenta X kg × Y reps". Proposta: dupla progressão (sobe reps dentro de uma faixa; ao atingir o topo em todas as séries, sobe a carga).
3. **Quão "inteligente" é a geração do plano.** Esta é a parte mais difícil e mais arriscada do projeto. Proposta honesta: regras determinísticas e testáveis (objetivo → divisão, séries, faixas de reps, descanso; restrições → substituições), não IA. É previsível, explicável e verificável.
4. **Onde vivem os dados.** Dados de saúde são categoria especial no RGPD (art. 9.º). Guardar só no telemóvel elimina quase todo o risco; sincronizar entre dispositivos obriga a servidor, login e mais superfície de ataque.
5. **Vídeos.** Alguns vídeos do YouTube têm a incorporação desativada pelo autor e não tocam dentro de outra app. É preciso um plano B (abrir no YouTube) e uma lista de domínios permitidos.
6. **Segurança física.** Para uma app que prescreve exercício, a anamnese deve incluir um rastreio tipo PAR-Q+ e travar ou avisar quando houver respostas de risco.

**Uma verdade incómoda:** o Hevy (gratuito) já cobre talvez 70–80% deste briefing. Construir uma app própria faz sentido quando se valoriza: plano adaptado às restrições pessoais, simplicidade extrema, vídeos à escolha, dados só no dispositivo e o gosto de a construir. Se o objetivo for apenas treinar e registar, usar o Hevy é mais rápido.

## 2. Comparação com apps de mercado

| | Strong | Hevy | Fitbod | JEFIT | Boostcamp | Alpha Progression | **Esta app** |
|---|---|---|---|---|---|---|---|
| Registo por série (carga/reps) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Mostra a última sessão ao registar | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (essencial) |
| RPE/RIR | ✔ | ✔ | ✗ | ✗ | parcial | ✔ | ✔ |
| Sugestão de progressão | ✗ | ✗ | ✔ (algoritmo) | parcial | ✔ (programas) | ✔ | ✔ (regras simples) |
| Plano gerado por objetivo/perfil | ✗ | ✗ | ✔ | ✔ | ✗ (programas prontos) | ✔ | ✔ |
| Vídeos/animações | ✗ (texto) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (links abertos) |
| Mapa/grupo muscular | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Temporizador de descanso | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Registo de dor/desconforto | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ (diferenciador) |
| Substituição por restrição | ✗ | ✗ | parcial | ✗ | ✗ | parcial | ✔ (diferenciador) |
| Funciona offline | ✔ | ✔ | parcial | ✔ | ✔ | ✔ | ✔ |
| Exportar dados | ✔ (CSV) | ✔ | parcial | parcial | ✗ | parcial | ✔ (JSON/CSV) |
| Social/gamificação | ✗ | ✔ | ✗ | ✔ | ✔ | ✗ | gamificação pequena (v1.2), sem social |

Nota: a tabela reflete o conhecimento destas apps em outubro de 2026; funcionalidades mudam com frequência e algumas podem estar só nas versões pagas.

### Complementos recomendados

**Entram na v1 (alto valor, pouco custo)**
- Valores da sessão anterior visíveis ao registar cada série, com sugestão para hoje.
- Temporizador de descanso automático ao concluir uma série.
- RIR por série e escala de dor 0–10 por exercício.
- Substituição de exercício (ex.: supino com barra → supino com halteres pega neutra) mantendo o histórico do grupo muscular.
- Aquecimento indicado nos primeiros exercícios compostos.
- Exportar e importar cópia de segurança (JSON) e CSV.

**Relatórios (os "um ou dois" pedidos)**
1. **Progressão por exercício:** melhor série e 1RM estimado (fórmula de Epley) ao longo do tempo, com marca de recorde pessoal.
2. **Semana em resumo:** aderência (treinos feitos vs planeados), séries semanais por grupo muscular vs alvo, e tendência de peso corporal e cintura. Para recomposição corporal, a cintura é um indicador mais útil do que o peso.

**Ficam para depois (ou nunca)**
- Semana de deload automática, calculadora de discos, integração com Apple Health / Health Connect (difícil numa app web), notificações (limitadas em iPhone), sincronização entre dispositivos.
- Não recomendo: social, gamificação, chat com IA. Acrescentam complexidade sem melhorar o treino.
- Atualização (v1.2): a pedido do utilizador, foi acrescentada uma gamificação pequena (sequência semanal, conquistas, recordes pessoais e de volume), calculada a partir do histórico e sem componente social. A sequência é semanal para não premiar treinar nos dias de descanso. Também foi acrescentada a descarga automática, em blocos de treino (especificação, secção 3.7).

## 3. Metodologia: SDD, TDD ou DDD

As três não são alternativas ao mesmo nível, por isso a resposta honesta é uma combinação, com pesos diferentes:

- **SDD (Spec-Driven Development) como processo principal.** Escrevemos especificações curtas e verificáveis (o que a app faz, critérios de aceitação em formato Dado/Quando/Então) antes de cada funcionalidade. É a abordagem que melhor funciona quando grande parte do código é escrito com um assistente de IA, porque a especificação passa a ser a referência para gerar e validar o código, e o utilizador consegue rever a especificação sem ler código.
- **TDD no núcleo do domínio.** Testes escritos antes do código nas partes onde um erro passa despercebido e tem consequências: regras de geração do plano, progressão de carga, substituições por restrição, cálculo de volume e 1RM, estado "treino do dia completo". Na interface, testes automáticos dos fluxos principais (ponta a ponta) em vez de TDD estrito, porque TDD na interface tem custo alto e retorno baixo.
- **DDD "leve", não DDD completo.** Uso a linguagem do domínio (Plano, Sessão, Exercício, Série, Grupo muscular, Restrição, Progressão) igual na especificação, no código e na app, e separo o domínio da interface e do armazenamento. Agregados, eventos de domínio, repositórios formais e contextos delimitados múltiplos seriam excesso de engenharia para uma app pessoal com um único domínio.

Em resumo: **SDD para decidir o quê, TDD para garantir que as regras estão certas, DDD leve para manter o código organizado.**

## 4. Arquitetura proposta

- **PWA (Progressive Web App):** uma só base de código que se instala no ecrã inicial do telemóvel e abre também no computador pelo navegador. Funciona offline. Sem lojas de apps, sem custos. É a opção mais portátil e minimalista para este caso.
- **Stack:** TypeScript, React + Vite, IndexedDB (via Dexie) para dados locais, Vitest para testes de unidade e Playwright para testes ponta a ponta.
- **Dados locais primeiro:** tudo fica no telemóvel. Cópia de segurança por exportação. Sincronização fica para uma versão futura, se for pedida.
- **Catálogo de exercícios** como ficheiro de dados versionado (nome, grupo muscular principal e secundários, padrão de movimento, equipamento, link de vídeo, objetivo, contraindicações, substitutos).
- **Vídeo:** ao tocar no link abre um leitor em ecrã sobreposto (YouTube via `youtube-nocookie.com`, Vimeo), com botão "abrir no YouTube" para vídeos que bloqueiam incorporação.
- **Alojamento:** GitHub Pages ou Cloudflare Pages (gratuitos, HTTPS).

Limitação honesta do iPhone: numa PWA, o iOS pode apagar dados de sites que não foram adicionados ao ecrã inicial. Instalada no ecrã inicial é estável, mas a exportação de cópias de segurança continua a ser importante.

## 5. Segurança

**No desenvolvimento**
- Repositório com revisão por pull request, análise automática de dependências (Dependabot) e de segredos, e testes obrigatórios a passar antes de juntar código.
- Poucas dependências, versões fixas (lockfile) e auditoria (`npm audit`) na integração contínua.
- Sem segredos no código; se houver servidor no futuro, variáveis de ambiente.

**Na aplicação**
- Content Security Policy restrita: scripts só da própria app; `frame-src` apenas para youtube-nocookie.com e player.vimeo.com.
- Links de vídeo validados contra lista de domínios permitidos; iframes com `sandbox` e `referrerpolicy`.
- Nenhum HTML vindo de dados é injetado diretamente (proteção contra XSS).
- Dados de saúde só no dispositivo; sem analytics nem rastreadores de terceiros.
- Importação de cópias de segurança validada por esquema antes de gravar.
- Se houver sincronização: autenticação forte, isolamento por utilizador no servidor (ex.: Row Level Security), cifra em trânsito e em repouso, e base legal RGPD clara.

**Segurança física (evidência)**
- Rastreio PAR-Q+ na anamnese (Warburton et al., 2011); respostas de risco geram aviso para consultar um profissional de saúde.
- Dor ≥ 4/10 num exercício leva a sugestão de substituto e bloqueio do aumento de carga nesse exercício.
- Parâmetros base para adultos de 40–50 anos com objetivo de recomposição: cada grupo muscular 2×/semana (Schoenfeld et al., 2016), cerca de 10+ séries semanais por grupo (Schoenfeld et al., 2017; a v1.1 usa 8+ por limite de tempo), maioria das séries a 1–3 RIR (Helms et al., 2016), progressão gradual (ACSM, 2009), proteína ~1,6 g/kg/dia como referência (Morton et al., 2018).
- Ombro e supino: pega mais fechada que o dobro da largura dos ombros e amplitude controlada reduzem a carga no ombro (Green & Comfort, 2007). Alternativas: halteres com pega neutra, floor press, máquina convergente.

A app não substitui avaliação médica nem de fisioterapia, e deve dizê-lo.

## Referências

- ACSM (2009). Progression models in resistance training for healthy adults. *Med Sci Sports Exerc*, 41(3), 687–708.
- Green, C. M., & Comfort, P. (2007). The affect of grip width on bench press performance and risk of injury. *Strength Cond J*, 29(5), 10–14.
- Helms, E. R., et al. (2016). Application of the repetitions in reserve-based RPE scale for resistance training. *Strength Cond J*, 38(4), 42–49.
- Morton, R. W., et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains. *Br J Sports Med*, 52(6), 376–384.
- Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2016). Effects of resistance training frequency on measures of muscle hypertrophy. *Sports Med*, 46(11), 1689–1697.
- Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci*, 35(11), 1073–1082.
- Warburton, D. E. R., et al. (2011). The PAR-Q+ and ePARmed-X+. *Health Fit J Can*, 4(2), 3–23.
