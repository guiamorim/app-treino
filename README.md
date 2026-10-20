# Treino

App pessoal (PWA) para seguir um plano de treino gerado a partir de uma anamnese, registar cada série e acompanhar a progressão. Funciona no iPhone (instalada no ecrã inicial) e em qualquer navegador, offline, com os dados guardados só no dispositivo.

Especificação: [specs/especificacao-v1.md](specs/especificacao-v1.md)

## Instalar no iPhone

1. Abre https://guiamorim.github.io/app-treino/ no **Safari**.
2. Toca em **Partilhar** → **Adicionar ao ecrã principal**.
3. Abre a app pelo ícone «Treino». Instalada assim, o iOS não apaga os dados.
4. Faz uma cópia de segurança de 2 em 2 semanas em **Mais → Exportar cópia**.

## Desenvolvimento

```bash
npm ci
npm run dev        # servidor local
npm test           # testes de unidade (domínio e dados)
npm run test:e2e   # testes ponta a ponta num iPhone simulado (build de produção)
npm run build      # gera dist/ com service worker e Content Security Policy
```

## Organização

```
specs/            especificação (fonte de verdade: SDD)
src/domain/       regras puras em TypeScript, escritas com TDD: plano, progressão, sessão, relatórios, cópia, vídeo
src/data/         IndexedDB (Dexie), exportação e importação
src/ui/           ecrãs React
src/catalog/      catálogo de exercícios (validado por esquema nos testes e ao arrancar)
tests/e2e/        Playwright
```

Cada teste tem o código do critério da especificação que verifica (ex.: `F4`, `3.2`).

## Segurança

- Sem servidor, sem contas, sem analytics: os dados de saúde nunca saem do dispositivo.
- Content Security Policy restrita; vídeos só de `youtube-nocookie.com` e `player.vimeo.com`, em iframe com `sandbox`.
- Links de vídeo e ficheiros importados validados (lista de domínios e esquema Zod) antes de serem usados.
- CI com `npm audit`, testes e Dependabot.

A app não substitui avaliação médica nem de fisioterapia.
