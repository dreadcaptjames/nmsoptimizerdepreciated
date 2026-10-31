# Family-first grouping and adjacency — October 31, 2026

## Problem

The previous solver began with randomly scattered technologies, then used stochastic swaps and a modest fragmentation penalty. It could settle in a local optimum in which secondary families had multiple islands, even when connected placements were available.

## Updated algorithm

1. Preserve the player’s locked and supercharged slot coordinates. Determine eligible SC modules using the selected optimization goal, exactly as before.
2. Place those high-priority tiles on the designated SC locations. Never evict them from SC for an adjacency reward.
3. Generate contiguous clusters of adjacency-compatible families across the remaining unlocked grid. For families with multiple SC anchors, first attempt short, physically valid bridges using family tiles, without traversing occupied or locked positions.
4. Use the existing annealing and local repair as a refinement step, with a stronger fragmentation penalty. Secondary groups matter even if their goal's weight is zero.
5. Suppress fabricated adjacency: no-adjacency utilities, Tractor Beam, stand-alone Corvette reactors and other unsupported links are excluded from group bonuses. All construction-linked tiles still occupy their required technology inventory slots.

## Limits

Some SC configurations force disconnected groups: e.g. four Hyperdrive modules in four corner supercharged slots of a 10×6 grid cannot form a connected cluster with only four modules. Keeping the goal-first SC selection is intentional. Locked positions or shortage of compatible module slots can also prevent a fully connected arrangement. ATLAS MAX is a planning heuristic rather than an exact game-stat optimizer.

## Regression checks

- All secondary families form one connected cluster where the modeled inventory permits it.
- Long-range priority SC slots remain occupied by Hyperdrive technology, while secondary families cluster.
- When corners force a primary-group split, secondary-family grouping remains intact.
- Locked positions stay empty; no module is dropped or duplicated.
- Every construction-generated Corvette module, including the no-adjacency Tractor Beam, appears exactly once.
- Repeated identical inputs produce deterministic layouts.

Run `node --test tests/*.test.cjs` from the extracted website root to repeat these checks.

## Follow-up correction: construction-only spatial clustering

A real exported Corvette PDF revealed that `noAdjacency` modules had been omitted from family grouping entirely. This was incorrect for planning: it separated multiple Legion-Class Habs and multiple Chelone-Class Generators despite available adjacent slots.

The optimizer now groups matching construction tiles geographically even when they have no verified in-game adjacency relationship. Their physical proximity does not increment actual adjacency links or modeled stat bonuses. A separation penalty and annealing guard prevent them from being scattered during later optimization. The exact 10×6, 50-tile Corvette manifest from the report is covered by a dedicated regression test.
