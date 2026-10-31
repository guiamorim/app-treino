# Treino

[English](README.md) · **Português**

App pessoal (PWA) para seguir um plano de treino gerado a partir de uma anamnese, registar cada série e acompanhar a progressão. Funciona no iPhone (instalada no ecrã inicial) e em qualquer navegador, offline, com os dados guardados só no dispositivo. A interface está em português de Portugal, inglês e espanhol; segue o idioma do telemóvel e muda-se em «Mais».

Especificação: [specs/especificacao-v1.md](specs/especificacao-v1.md) · Análise de mercado e metodologia: [docs/analise.pt-PT.md](docs/analise.pt-PT.md)

## Instalar no iPhone

1. Abre https://guiamorim.github.io/app-treino/ no **Safari**.
2. Toca em **Partilhar** → **Adicionar ao ecrã principal**.
3. Abre a app pelo ícone «Treino». Instalada assim, o iOS não apaga os dados.
4. Faz uma cópia de segurança de 2 em 2 semanas em **Mais → Exportar cópia**.

## Desenvolvimento

```bash
npm ci
npm run dev        # servidor local
npm run lint       # oxlint (regras de correção e de hooks do React)
npm test           # testes de unidade (domínio e dados)
npx playwright install chromium webkit   # uma vez, para os testes ponta a ponta
npm run test:e2e   # testes ponta a ponta num iPhone simulado, motores do Chrome e do Safari (build de produção)
npm run build      # gera dist/ com service worker e Content Security Policy
```

## Publicar uma versão nova

1. Acrescenta a versão no topo de `src/novidades.json`, com a data e um resumo curto do que muda (é o que aparece no aviso «Nova versão disponível» e no Início depois de atualizar). Atualiza «Em preparação» se for o caso.
2. Usa o mesmo número em `package.json` (um teste confirma que são iguais). Acrescenta o resumo em inglês e espanhol em `traducoes`.
3. Depois de juntar ao ramo principal e o CI passar, o GitHub Pages publica e a app instalada mostra o aviso quando volta a abrir ou ao primeiro plano.

## Organização

```
specs/            especificação (fonte de verdade: SDD), em PT e EN
docs/             análise de mercado e metodologia, em PT e EN
src/domain/       regras puras em TypeScript, escritas com TDD: plano, blocos, progressão, sessão, relatórios, painel, conquistas, fotos, perfil, cópia, exportação (PDF e Excel escritos à mão), mapa muscular, alongamentos, vídeo
src/data/         IndexedDB (Dexie), exportação e importação
src/ui/           ecrãs React
src/catalog/      catálogos de exercícios e de alongamentos (validado por esquema nos testes e ao arrancar)
src/novidades.json  novidades de cada versão e o que está em preparação, mostradas na app
src/i18n/         traduções da interface em inglês e espanhol (a frase em português é a chave)
tests/e2e/        Playwright
```

Cada texto mostrado na app é escrito em português dentro de `t('…')` e traduzido em `src/i18n/en.json` e `src/i18n/es.json`; um teste (F21) falha se faltar uma tradução.

Cada teste tem o código do critério da especificação que verifica (ex.: `F4`, `3.2`).

## Segurança

- Sem servidor, sem contas, sem analytics: os dados de saúde nunca saem do dispositivo. A única coisa enviada é um reporte ou sugestão (F34), quando a pessoa carrega em «Enviar», através de um serviço de formulários (Web3Forms) que o reencaminha por email.
- Content Security Policy restrita; vídeos só de `youtube-nocookie.com` e `player.vimeo.com`, em iframe com `sandbox`.
- Links de vídeo e ficheiros importados validados (lista de domínios e esquema Zod) antes de serem usados.
- CI com `npm audit`, testes e Dependabot.

## Documentação

Toda a documentação existe em português e em inglês. Quem alterar um documento atualiza as duas versões no mesmo commit.

A app não substitui avaliação médica nem de fisioterapia.

## Material de terceiros

- Desenhos dos músculos em `src/ui/corpo/corpos.json`: extraídos de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) 3.2.0, © 2022 Hicham Elabbassi, licença MIT ([src/ui/corpo/LICENSE](src/ui/corpo/LICENSE)).
