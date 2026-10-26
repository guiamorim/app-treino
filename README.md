# Treino

**English** · [Português](README.pt-PT.md)

A personal PWA to follow a training plan generated from an intake questionnaire (anamnesis), log every set and track progression. It works on the iPhone (installed on the home screen) and in any browser, offline, with data stored on the device only. The app's interface is in European Portuguese, English and Spanish; it follows the phone's language and can be changed in "Mais" (More).

Specification: [specs/specification-v1.en.md](specs/specification-v1.en.md) · Market analysis and methodology: [docs/analysis.en.md](docs/analysis.en.md)

## Install on the iPhone

1. Open https://guiamorim.github.io/app-treino/ in **Safari**.
2. Tap **Share** → **Add to Home Screen**.
3. Open the app from the «Treino» icon. Installed this way, iOS does not delete its data.
4. Make a backup every 2 weeks in **Mais → Exportar cópia**.

## Development

```bash
npm ci
npm run dev        # local server
npm run lint       # oxlint (correctness and React hooks rules)
npm test           # unit tests (domain and data)
npx playwright install chromium webkit   # once, for the end-to-end tests
npm run test:e2e   # end-to-end tests on a simulated iPhone, Chrome and Safari engines (production build)
npm run build      # builds dist/ with service worker and Content Security Policy
```

## Releasing a new version

1. Add the version at the top of `src/novidades.json`, with the date and a short summary of what changes (this is what the "Nova versão disponível" notice and Home show after updating). Update "Em preparação" (in preparation) if needed.
2. Use the same number in `package.json` (a test checks they match). Add the English and Spanish summary under `traducoes`.
3. Once merged into the main branch and CI passes, GitHub Pages publishes it and the installed app shows the notice the next time it opens or comes to the foreground.

## Layout

```
specs/            specification (source of truth: SDD), in PT and EN
docs/             market analysis and methodology, in PT and EN
src/domain/       pure TypeScript rules, written with TDD: plan, blocks, progression, session, reports, dashboard, achievements, photos, profile, backup, export (PDF and Excel written by hand), muscle map, stretching, video
src/data/         IndexedDB (Dexie), export and import
src/ui/           React screens
src/catalog/      exercise and stretch catalogues (schema-validated in tests and at startup)
src/novidades.json  what's new in each version and what is in preparation, shown in the app
src/i18n/         English and Spanish translations of the UI (the Portuguese text is the key)
tests/e2e/        Playwright
```

Every text shown in the app is written in Portuguese inside `t('…')` and translated in `src/i18n/en.json` and `src/i18n/es.json`; a test (F21) fails if a translation is missing.

Each test carries the code of the specification criterion it checks (e.g. `F4`, `3.2`). Code identifiers follow the Portuguese domain language; the specification maps each term to English.

## Security

- No server, no accounts, no analytics: health data never leaves the device.
- Strict Content Security Policy; videos only from `youtube-nocookie.com` and `player.vimeo.com`, in a sandboxed iframe.
- Video links and imported files are validated (domain allowlist and Zod schema) before use.
- CI with `npm audit`, tests and Dependabot.

## Documentation

All documentation exists in Portuguese and English. Whoever changes a document updates both versions in the same commit.

The app does not replace medical or physiotherapy assessment.

## Third-party material

- Muscle drawings in `src/ui/corpo/corpos.json`: extracted from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) 3.2.0, © 2022 Hicham Elabbassi, MIT licence ([src/ui/corpo/LICENSE](src/ui/corpo/LICENSE)).
