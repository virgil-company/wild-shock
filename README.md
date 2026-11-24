# Wild Shock

Wild Shock is a single-player, turn-based spellcraft roguelike for the browser. Start a new journey and select **Rift Wizard 3 Classic** to play the 21-realm campaign. **Standard** uses Wild Shock's 100-realm campaign, potions and one equipped item per slot. The interface supports English, Brazilian Portuguese and Spanish. Many catalog names and rule descriptions use their original English text.

## Play locally

Run `npm run dev` with Python 3 installed and open http://localhost:5173. The game uses native ES modules. This release starts a fresh journey and saves it in the browser under `wild-shock-v2`. For the automated tests and static build, use Node.js 20 or newer.

## Reference build and coverage

The latest developer announcement found on November 23, 2026 was the October 12 beta patch. Wild Shock uses the community compendium for that beta, build **25891047**. The previous catalog contained the live build's spells, equipment and components. The table compares the two upstream datasets. [Developer announcements](https://steamcommunity.com/app/4366330/?l=english) · [Compendium](https://hpp3.github.io/rw3/) · [Build manifest](https://hpp3.github.io/rw3/versions.json)

| Category | Live build 24995190 | Beta build 25891047 | In Wild Shock |
| --- | ---: | ---: | --- |
| Spells | 196 | 198 | Grimoire, targeting, charges, channeling and spellbook access |
| Spell upgrades | 789 | 797 | Purchasable upgrades, stat modifiers and individual combat rules |
| Equipment | 365 | 375 | Searchable recipes, selected ingredients, passive bonuses and event-triggered effects |
| Components | 93 | 94 | Collectible ingredients, affinities and pickup/craft effects |
| Units | 494 | 496 | Searchable bestiary, attacks, resistances, passives and encounter or summon pools |
| Outfits | 81 | 81 | Browser wardrobe with local unlocks and palette variants |

The beta adds Orb of Explosions, Orb of Reflection, ten equipment recipes and Ball Lightning. Examples of implemented interactions include relocating a single orb, reflecting typed damage, using the Shrine of Knowledge with a rare crafting component, and doubling spell charges with a tome.

The public catalog contains tooltips, stats and recipes. Some conditional upgrades, equipment triggers and unit abilities still use shared combat rules or have only their catalog description. The Sculptor vault's unique reward, the complete trial and achievement rules, original wardrobe artwork, Steam achievements and Workshop integration are outstanding. Encounter layouts, mastery scaling, reward frequency and balance are Wild Shock adaptations. The tests exercise learning and casting every spell, purchasing every upgrade and crafting eligibility across the entire catalog. Additional tests run combat with every species on both teams and collect every component. Individual rule tests cover selected interactions, including Mordred's three forms, Ophan's redirected damage, orb relocation and Petrify's stacking debuff. Full behavioral equivalence with the original game is unverified.

## Campaign and equipment

- Inspect an exit to see the next realm's creatures, shrine and components. Reroll the destinations before traveling. In the Rift Wizard campaign, choose between two realm 20 bosses and face Mordred in realm 21. Choose a free landing tile after traveling.
- The generator includes common and rare creatures, giants with multi-tile footprints, lairs and ten themed vaults. Recruit companions on the board. Keeping the Great Faery alive through the Fettered Fae vault lets her accompany you into later realms.
- The forge accepts specific affinities and wildcards. Each component contributes all its affinities. Choose the actual ingredients before crafting to control ingredient effects. Rift Wizard modes allow multiple equipped items of the same type. Dismantle crafted gear at the Shrine of Reformation.
- Spellbooks grant access to ten forbidden spells. Ten shrine types provide different choices. Acquired scrolls and equipment chests offer a choice that persists until claimed.
- Weekly runs use the same seed and modifiers throughout each Monday-to-Sunday UTC week. Custom runs let you choose modifiers. Scavenger uses four-option scrolls and chests. Improviser limits the spell and recipe pools for the journey.
- The field guide includes the wardrobe. The bestiary has a full reference and a filter for creatures defeated across your journeys.

### Controls

| Action | Control |
| --- | --- |
| Move or strike | WASD, arrow keys, touch controls or click a destination |
| Diagonal step in Rift Wizard modes | Click an adjacent diagonal tile or use numpad 1, 3, 7 or 9 |
| Open grimoire / forge | G or T / F |
| Select and cast a spell | 1–9 or select a spell, then click the target |
| Recall last spell and target / cast there | Q / Enter |
| Cancel targeting | Escape |
| Wait or advance channel | Space |
| Drink a restoration potion, when available | P |
| Toggle enemy attack zones | Y |
| Change animation speed | [ and ] |

## Catalog maintenance

Download the desired dataset listed in the compendium build manifest and run `python3 scripts/import-compendium.py /path/to/data.beta.json`. The generated catalog includes the build ID and branch. The browser uses the bundled data offline after the page has loaded. Combat behavior is implemented separately in `src/engine/`, `src/rules/` (`rw3.js`, `spell-effects.js`, `equipment-effects.js`, `component-effects.js`) and `src/data/bestiary.js`.

## GitHub Pages

The repository includes `.github/workflows/pages.yml`. In the GitHub repository, select **Settings → Pages → Build and deployment → Source: GitHub Actions**, then push the project to `main` or manually run the deployment workflow. The workflow runs tests, builds `dist/`, and deploys it with the official Pages actions. If using a different default branch, update the workflow's branch filter.

All asset paths are relative, supporting a project URL such as `https://virgil-company.github.io/wild-shock/`. This is the expected URL after deployment, not a claim that the site is already published.

Alternatively, publish the repository root from a branch: it contains the static entry point and `.nojekyll`.

```sh
npm test
npm run build
```
