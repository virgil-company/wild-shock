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
- Three collectible crafting materials and six permanent artifacts with stat bonuses and combat triggers.
- Three-use transmutation shrines, exact portal reward previews, and toggleable enemy attack zones.
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
| Toggle enemy attack zones | Y or the button below the board |
| Inspect | Hover or tap a creature |

Learning is free of turn cost. Each root unlocks its school/path spell. Later ranks require the previous rank and cost 1–4 skill points. Collect memory shards and clear realms to gain points. You specialize within a journey; the whole atlas is not intended to be purchased in a single run.

Clear every hostile before entering a portal. New realms restore health and spell charges. The upper portal selects Mossbound enemy affinities; the lower selects Emberfall affinities. Complete realm 24 and enter a portal to win.

## Artifact forge and scouting

Open **Recipes & equipment** in the right-hand Artifact Forge. New journeys start with one spark, ember, and crystal. Collect the lettered S/E/C tokens by walking onto them. Crafting is free of turn cost, consumes the listed materials, and permanently equips the artifact for that journey. Each recipe can be crafted once; all six can coexist.

| Artifact | Recipe | Effect |
| --- | --- | --- |
| Stormglass Rod | 2 spark + 1 crystal | +4 Storm/Astral spell damage |
| Cinderheart | 2 ember + 1 spark | +4 Ember damage; heal 2 HP per kill |
| Rime Mantle | 2 crystal + 1 ember | Start each new realm with 8 ward; +1 frost duration |
| Wayfarer Prism | 2 crystal + 1 spark | +1 spell range, +2 maximum and current charges when crafted |
| Thorn Ring | 1 ember + 1 crystal | Spell hits apply at least 3 turns of poison |
| Storm Bell | 2 spark + 2 ember | Every third cast after crafting deals 5 damage to visible enemies within 4 tiles |

Stand within one tile (including diagonals) of the blue shrine to exchange one material for another. Use the From/To controls in the forge. Each shrine allows three exchanges; each exchange advances combat one turn. Hover or tap a portal to preview the next realm's hostiles, boss, affinities and materials. Mossbound provides two sparks and a crystal; Emberfall provides two embers and a crystal.

**Y** toggles current enemy attack areas, respecting walls, freeze and next-turn shock. This overlay shows current attack range, not a prediction of future movement. Old saves retain their current realm and gain empty crafting inventories; new props appear on entering the next realm. Existing skill progression remains available alongside crafting.

### Research references

These are original, smaller adaptations of mechanics described in [Rift Wizard 3's official store page](https://store.steampowered.com/app/4366330/Rift_Wizard_3/) (components, crafted passive artifacts, and portal choices) and [developer patch notes](https://steamcommunity.com/app/4366330/?l=english) (transmutation shrines and threat inspection), consulted October 25, 2026. Recipes, numbers and artifact effects here are specific to Wild Shock, not a reproduction of Rift Wizard 3's full systems or balance.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In the GitHub repository, select **Settings → Pages → Build and deployment → Source: GitHub Actions**, then push the project to `main` or manually run the deployment workflow. The workflow runs tests, builds `dist/`, and deploys it with the official Pages actions. If using a different default branch, update the workflow's branch filter.

All asset paths are relative, supporting a project URL such as `https://virgil-company.github.io/wild-shock/`. This is the expected URL after deployment, not a claim that the site is already published.

Alternatively, publish the repository root from a branch: it contains the static entry point and `.nojekyll`.

```sh
npm test
npm run build
```

## Project structure

- `src/artifacts.js`: material recipes, artifact definitions and spell bonuses.
- `src/catalog.js`: deterministic skill catalog and accumulated spell statistics.
- `src/engine.js`: DOM-independent world generation, actions, AI, progression, and save serialization.
- `src/app.js`: canvas pixel art, interface, input, atlas, and local storage.
- `style.css`: responsive dark fantasy interface.
- `tests/artifacts.test.js`: crafting, combat triggers, shrines, scouting, generation and save migration.
- `tests/engine.test.js`: catalog, generation, combat, progression, and save tests.
- `scripts/build.mjs`: static distribution packaging.

The pixel artwork is drawn directly in canvas. Google Fonts is optional; system fonts work if the font service is unavailable. Saved games are stored only in the current browser under `wild-shock-v1`. Private browsing or clearing site data may remove progress. This initial version has automated mechanics coverage; full-campaign difficulty and build balance need playtesting.
