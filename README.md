# Wild Shock

An original browser-based tactical spellcraft roguelike inspired by the single-screen, turn-based wizard combat of Rift Wizard. All code, interface text, and documentation are in English. No backend, runtime framework, account, or build dependencies are required.

## Play locally

Requires Node.js 20+ for tests/build and Python 3 for the local server.

```sh
npm run dev
```

Open http://localhost:5173. Serve over HTTP; ES modules cannot reliably run by opening `index.html` directly.

## Gameplay

- 24 seeded procedural realms, two exit choices, and a boss every sixth realm.
- Strict turn-based movement, melee, ranged spells, line of sight, enemy pathfinding, and visible attack intentions.
- 12 magic schools, 144 unlockable spells, and **2,304 connected skill nodes**: 12 schools × 12 paths × 16 ranks.
- The atlas is a combinatorial progression system: ranks improve school-wide attributes rather than representing 2,304 bespoke spell behaviors. Area, range, chain, damage, protection, reserves, status duration, vitality, echo damage, leech, and resistance penetration all affect combat.
- Burn, poison, freeze, shock, drain, healing, and wards; same-school enemy resistance.
- Limited spell charges, restoration potions, skill-point pickups, realm-clear rewards, permanent death, and a final victory state.
- Automatic browser-local saving, reproducible world seeds, responsive interface, and touch movement controls.

### Controls

| Action | Control |
| --- | --- |
| Move / melee | WASD or arrow keys; adjacent tile click; touch arrows |
| Select spell | Click the grimoire or press 1–9 |
| Cast | Click a floor tile in range and line of sight |
| Cancel targeting | Escape |
| Wait | Space |
| Restoration potion | P |
| Skill atlas | T |
| Inspect | Hover or tap a creature |

Learning is free of turn cost. Each root unlocks its school/path spell. Later ranks require the previous rank and cost 1–4 skill points. Collect memory shards and clear realms to gain points. You specialize within a journey; the whole atlas is not intended to be purchased in a single run.

Clear every hostile before entering a portal. New realms restore health and spell charges. The upper portal selects Mossbound enemy affinities; the lower selects Emberfall affinities. Complete realm 24 and enter a portal to win.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In the GitHub repository, select **Settings → Pages → Build and deployment → Source: GitHub Actions**, then push the project to `main` or manually run the deployment workflow. The workflow runs tests, builds `dist/`, and deploys it with the official Pages actions. If using a different default branch, update the workflow's branch filter.

All asset paths are relative, supporting a project URL such as `https://virgil-company.github.io/wild-shock/`. This is the expected URL after deployment, not a claim that the site is already published.

Alternatively, publish the repository root from a branch: it contains the static entry point and `.nojekyll`.

```sh
npm test
npm run build
```

## Project structure

- `src/catalog.js`: deterministic skill catalog and accumulated spell statistics.
- `src/engine.js`: DOM-independent world generation, actions, AI, progression, and save serialization.
- `src/app.js`: canvas pixel art, interface, input, atlas, and local storage.
- `style.css`: responsive dark fantasy interface.
- `tests/engine.test.js`: catalog, generation, combat, progression, and save tests.
- `scripts/build.mjs`: static distribution packaging.

The pixel artwork is drawn directly in canvas. Google Fonts is optional; system fonts work if the font service is unavailable. Saved games are stored only in the current browser under `wild-shock-v1`. Private browsing or clearing site data may remove progress. This initial version has automated mechanics coverage; full-campaign difficulty and build balance need playtesting.
