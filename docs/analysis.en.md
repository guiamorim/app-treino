# Training app: market analysis and methodology

**English** · [Português](analise.pt-PT.md)

Date: 2026-10-20. Analysis written before the specification; final decisions are in [specs/specification-v1.en.md](../specs/specification-v1.en.md). The user's personal data has been removed from this public version.

## 1. Honest assessment of the brief

**What is well defined**
- Personal use, on the phone, also reachable from the web.
- Logging what is done in each exercise, stored for later review.
- Today's workout list with status (done / to do / workout complete).
- Per exercise: primary muscle group, demo video and a summary of its purpose.
- Plan generated from a goal + anamnesis.
- 1 or 2 reports with practical indicators.

**What is missing or ambiguous**
1. **What is logged per set.** Without it there are no useful reports. Proposal: load, reps and RIR (reps in reserve: how many more reps could still be done) per set, plus an optional pain/discomfort field (0–10).
2. **How the plan progresses.** The brief talks about generating the plan, not adjusting it. The most useful part of market apps is saying "today try X kg × Y reps". Proposal: double progression (add reps within a range; once every set hits the top, add load).
3. **How "smart" plan generation is.** This is the hardest and riskiest part of the project. Honest proposal: deterministic, testable rules (goal → split, sets, rep ranges, rest; restrictions → substitutions), not AI. Predictable, explainable and verifiable.
4. **Where the data lives.** Health data is a special category under the GDPR (art. 9). Keeping it on the phone only removes almost all of the risk; syncing across devices requires a server, login and a larger attack surface.
5. **Videos.** Some YouTube videos have embedding disabled by their author and won't play inside another app. A fallback (open in YouTube) and a domain allowlist are needed.
6. **Physical safety.** An app that prescribes exercise should include PAR-Q+-style screening in the anamnesis and block or warn on risk answers.

**An uncomfortable truth:** Hevy (free) already covers maybe 70–80% of this brief. Building your own app makes sense when you value: a plan adapted to personal restrictions, extreme simplicity, videos of your choice, data that stays on the device, and the enjoyment of building it. If the goal is only to train and log, using Hevy is faster.

## 2. Comparison with market apps

| | Strong | Hevy | Fitbod | JEFIT | Boostcamp | Alpha Progression | **This app** |
|---|---|---|---|---|---|---|---|
| Per-set logging (load/reps) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Shows last session while logging | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (essential) |
| RPE/RIR | ✔ | ✔ | ✗ | ✗ | partial | ✔ | ✔ |
| Progression suggestion | ✗ | ✗ | ✔ (algorithm) | partial | ✔ (programs) | ✔ | ✔ (simple rules) |
| Plan generated from goal/profile | ✗ | ✗ | ✔ | ✔ | ✗ (ready-made programs) | ✔ | ✔ |
| Videos/animations | ✗ (text) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (open links) |
| Muscle map/group | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Rest timer | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Pain/discomfort logging | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✔ (differentiator) |
| Restriction-based substitution | ✗ | ✗ | partial | ✗ | ✗ | partial | ✔ (differentiator) |
| Works offline | ✔ | ✔ | partial | ✔ | ✔ | ✔ | ✔ |
| Data export | ✔ (CSV) | ✔ | partial | partial | ✗ | partial | ✔ (JSON/CSV) |
| Social/gamification | ✗ | ✔ | ✗ | ✔ | ✔ | ✗ | ✗ (on purpose) |

Note: the table reflects knowledge of these apps as of October 2026; features change often and some may be paid-only.

### Recommended additions

**In v1 (high value, low cost)**
- Previous session's values visible while logging each set, with today's suggestion.
- Rest timer that starts automatically when a set is completed.
- RIR per set and a 0–10 pain scale per exercise.
- Exercise substitution (e.g. barbell bench press → neutral-grip dumbbell press) keeping the muscle group's history.
- Warm-up guidance on the first compound exercises.
- Backup export and import (JSON) and CSV.

**Reports (the "one or two" requested)**
1. **Progression per exercise:** best set and estimated 1RM (Epley formula) over time, with personal record markers.
2. **Week in review:** adherence (workouts done vs planned), weekly sets per muscle group vs target, and body weight and waist trend. For body recomposition, waist is a more useful indicator than weight.

**Later (or never)**
- Automatic deload week, plate calculator, Apple Health / Health Connect integration (hard in a web app), notifications (limited on iPhone), cross-device sync.
- Not recommended: social, gamification, AI chat. They add complexity without improving training.

## 3. Methodology: SDD, TDD or DDD

The three are not alternatives at the same level, so the honest answer is a combination, with different weights:

- **SDD (Spec-Driven Development) as the main process.** Short, verifiable specifications (what the app does, Given/When/Then acceptance criteria) are written before each feature. It works best when much of the code is written with an AI assistant, because the specification becomes the reference for generating and validating the code, and the user can review the specification without reading code.
- **TDD in the domain core.** Tests written before the code where a mistake goes unnoticed and has consequences: plan generation rules, load progression, restriction-based substitution, volume and 1RM calculation, "today's workout complete" status. For the UI, automated end-to-end tests of the main flows instead of strict TDD, because TDD on UI costs a lot and returns little.
- **Light DDD, not full DDD.** The domain language (Plan, Session, Exercise, Set, Muscle group, Restriction, Progression) is the same in the specification, the code and the app, and the domain is kept separate from UI and storage. Aggregates, domain events, formal repositories and multiple bounded contexts would be over-engineering for a personal app with a single domain.

In short: **SDD to decide what, TDD to make sure the rules are right, light DDD to keep the code organised.**

## 4. Proposed architecture

- **PWA (Progressive Web App):** a single codebase that installs on the phone's home screen and also opens on the computer in the browser. Works offline. No app stores, no cost. The most portable and minimal option for this case.
- **Stack:** TypeScript, React + Vite, IndexedDB (via Dexie) for local data, Vitest for unit tests and Playwright for end-to-end tests.
- **Local-first data:** everything stays on the phone. Backup through export. Sync is left for a future version, if requested.
- **Exercise catalogue** as a versioned data file (name, primary and secondary muscle groups, movement pattern, equipment, video link, purpose, contraindications, substitutes).
- **Video:** tapping the link opens a player in an overlay (YouTube via `youtube-nocookie.com`, Vimeo), with an "open in YouTube" button for videos that block embedding.
- **Hosting:** GitHub Pages or Cloudflare Pages (free, HTTPS).

Honest iPhone limitation: for a PWA, iOS may delete data from sites that were not added to the home screen. Installed on the home screen it is stable, but exporting backups still matters.

## 5. Security

**In development**
- Repository with pull-request review, automated dependency (Dependabot) and secret scanning, and tests required to pass before merging.
- Few dependencies, pinned versions (lockfile) and auditing (`npm audit`) in CI.
- No secrets in the code; environment variables if a server is ever added.

**In the application**
- Strict Content Security Policy: scripts only from the app itself; `frame-src` only for youtube-nocookie.com and player.vimeo.com.
- Video links validated against a domain allowlist; iframes with `sandbox` and `referrerpolicy`.
- No HTML from data is ever injected directly (XSS protection).
- Health data on the device only; no third-party analytics or trackers.
- Backup imports validated by schema before being written.
- If sync is ever added: strong authentication, per-user isolation on the server (e.g. Row Level Security), encryption in transit and at rest, and a clear GDPR legal basis.

**Physical safety (evidence)**
- PAR-Q+ screening in the anamnesis (Warburton et al., 2011); risk answers trigger a warning to see a health professional.
- Pain ≥ 4/10 in an exercise leads to a substitute suggestion and blocks load increases on that exercise.
- Baseline parameters for adults aged 40–50 aiming at body recomposition: each muscle group 2×/week (Schoenfeld et al., 2016), around 10+ weekly sets per group (Schoenfeld et al., 2017; v1.1 uses 8+ because of time limits), most sets at 1–3 RIR (Helms et al., 2016), gradual progression (ACSM, 2009), protein ~1.6 g/kg/day as a reference (Morton et al., 2018).
- Shoulder and bench press: a grip narrower than twice shoulder width and a controlled range of motion reduce shoulder load (Green & Comfort, 2007). Alternatives: neutral-grip dumbbells, floor press, converging machine.

The app does not replace medical or physiotherapy assessment, and must say so.

## References

- ACSM (2009). Progression models in resistance training for healthy adults. *Med Sci Sports Exerc*, 41(3), 687–708.
- Green, C. M., & Comfort, P. (2007). The affect of grip width on bench press performance and risk of injury. *Strength Cond J*, 29(5), 10–14.
- Helms, E. R., et al. (2016). Application of the repetitions in reserve-based RPE scale for resistance training. *Strength Cond J*, 38(4), 42–49.
- Morton, R. W., et al. (2018). A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains. *Br J Sports Med*, 52(6), 376–384.
- Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2016). Effects of resistance training frequency on measures of muscle hypertrophy. *Sports Med*, 46(11), 1689–1697.
- Schoenfeld, B. J., Ogborn, D., & Krieger, J. W. (2017). Dose-response relationship between weekly resistance training volume and increases in muscle mass. *J Sports Sci*, 35(11), 1073–1082.
- Warburton, D. E. R., et al. (2011). The PAR-Q+ and ePARmed-X+. *Health Fit J Can*, 4(2), 3–23.
