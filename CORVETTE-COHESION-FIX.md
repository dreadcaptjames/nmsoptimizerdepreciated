# Corvette construction grouping correction — 2026-10-31

## Reproduced from the user's exported PDF

- Long-range traveller, S-class Corvette, 10 columns × 6 rows, 50 occupied technology positions.
- Player-marked supercharged positions: R1 C1, R1 C8, R1 C10, R3 C6.
- Three Legion-Class Habs were at R3 C1, R3 C2, R6 C8.
- Two Chelone-Class Generators were at R2 C9, R3 C4.
- Their separation had no useful gameplay or construction purpose.

## Root cause

The prior `groupingFamily` function skipped `noAdjacency` tiles and families with `adjacency:'none'`. Both Habs and Chelone Reactors fall into this category. The placement initializer therefore scattered them as loose content, and the scorer and final cohesion pass could not detect or repair those splits.

## Correction

1. Physical construction tiles from the same modeled family now share a geometric grouping key, independent of whether their game adjacency stats are verified.
2. Different physical reactor models can also share one visual reactor cluster without claiming an adjacency effect. The scoring system separately measures physical grouping breaks and real validated technology links. No bonus is inferred from hab/reactor contact.
3. The annealer cannot make connected family groups worse while rearranging the rest of the inventory, and the final cohesion pass can move non-adjacency built tiles.
4. Priority Long Range supercharged Hyperdrive modules are still pinned to the player's marked SC slots.

## Verified PDF-case result

With the same module manifest and marked SC coordinates, the updated solver places all three Legion-Class Habs at R2 C3–C5 and the two Chelone-Class Generators at R3 C1–C2. All four SC slots contain Hyperdrive modules; no invented adjacency links are counted. Positions may differ if the user changes enabled families or other settings.

## Deployment

Use the included universal static website files on GitHub Pages, Netlify, or another static host. Click **Optimize Corvette tech** again after installing the update. Exported PDFs are read-only snapshots and cannot restore an editable build; use Backup JSON for that.

Run `node --test tests/*.test.cjs` from the site root to repeat regression checks.
