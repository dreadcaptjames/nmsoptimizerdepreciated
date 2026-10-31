# Corvette Tractor Beam — slot-aware catalog correction

The Tractor Beam was already in the full historic part data under an `utility` group. It was accidentally removed from the visible performance catalog and generated no technology tile. This change makes the functional **Cosmos 7.0** utility visible and counts it in the Corvette technology inventory.

- Visible in **Utility & salvage systems** and dedicated **Utilities & salvage** filter; discoverable via search.
- Selecting one Tractor Beam reserves one **TRB** construction-generated technology tile; multiple copies are each modeled as taking a slot for planning purposes pending in-game verification.
- **Zero modeled adjacency and SC performance benefit**; no damage or warp/stat bonus is assigned.
- The **Salvage specialist** generated plan includes a Tractor Beam.
- Full or locked technology grids show the existing construction-overflow warning plus Tractor-Beam-specific guidance when applicable.
- PDFs and JSON exports use the existing technology layout/manifest and automatically include the new tile/part.
- Existing item IDs, imported plans, and other Corvette module calculations are preserved.

**Grounding:** Hello Games confirmed the Corvette Tractor Beam in the official Cosmos update: https://www.nomanssky.com/cosmos-update/ . The reported problem with installation when no technology slots are free is community-sourced, not stated as a universally reproducible official bug fix: https://www.reddit.com/r/oldmansky/comments/1wgdg22/tractor_beam_not_being_recognised_check_your/ .
