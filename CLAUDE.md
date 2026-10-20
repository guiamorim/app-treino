# Notes for contributors and AI assistants

- **Bilingual documentation.** Every document in this repository exists in English and European Portuguese (`README.md` / `README.pt-PT.md`, `specs/specification-v1.en.md` / `specs/especificacao-v1.md`, `docs/analysis.en.md` / `docs/analise.pt-PT.md`). A change to one updates the other in the same commit. Each document links to its counterpart at the top.
- **No personal data.** The repository is public. Never commit anyone's real anamnesis, measurements, health information or training logs. Tests use the fictitious profile `perfilExemplo` in `src/domain/fixtures.ts`.
- **Spec first.** `specs/` is the source of truth. Change the specification (both languages) before or together with the code, and keep each test named after the criterion it checks (e.g. `F4`, `3.2`).
- **Domain language.** Code identifiers use the Portuguese domain terms from section 1 of the specification. The app UI is in European Portuguese.
- **Checks before pushing:** `npm run typecheck`, `npm test`, `npm run test:e2e`.
