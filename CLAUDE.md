# Notes for contributors and AI assistants

- **Bilingual documentation.** Every document in this repository exists in English and European Portuguese (`README.md` / `README.pt-PT.md`, `specs/specification-v1.en.md` / `specs/especificacao-v1.md`, `docs/analysis.en.md` / `docs/analise.pt-PT.md`). A change to one updates the other in the same commit. Each document links to its counterpart at the top.
- **No personal data.** The repository is public. Never commit anyone's real anamnesis, measurements, health information or training logs. Tests use the fictitious profile `perfilExemplo` in `src/domain/fixtures.ts`.
- **Spec first.** `specs/` is the source of truth. Change the specification (both languages) before or together with the code, and keep each test named after the criterion it checks (e.g. `F4`, `3.2`).
- **Domain language.** Code identifiers use the Portuguese domain terms from section 1 of the specification. The app UI is in European Portuguese, English and Spanish (F21).
- **Releases.** A change with new features adds a version at the top of `src/novidades.json` (summary in European Portuguese with English and Spanish under `traducoes`, shown in the app) and bumps `package.json` to the same number (F20).
- **Three UI languages.** Every new text shown in the app is written in Portuguese inside `t('…')` (or `m('…')` for constants) and gets its English and Spanish translation in `src/i18n/en.json` and `src/i18n/es.json` in the same change; new exercises and stretches also need entries in `src/catalog/i18n/`. The F21 test fails otherwise.
- **Checks before pushing:** `npm run typecheck`, `npm test`, `npm run test:e2e`.
