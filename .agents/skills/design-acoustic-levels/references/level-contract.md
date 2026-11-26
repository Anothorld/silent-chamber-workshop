# Level Contract

Write this before editing a level. Keep answers specific enough to test.

## Player Decision

- Central question: what must the player infer or choose?
- Two viable actions: where, when, and how loudly can the player act? What does each cost?
- Discovery, commitment, consequence, recovery: what happens in that order?
- Prior knowledge: which earlier level taught each required rule?

## Spatial and Acoustic Graph

Name the start, exit, required triggers, observation positions, cover, risk zones, branches, and return paths. Mark which edges are closed before a trigger. For every clue, state its source, sound range or timing, the player position from which it can be perceived, and the action it suggests.

## Element Roles

Use one row per deliberate element or group. Keep only elements whose removal changes a decision.

| Element | Role: gate/clue/pressure/alternative/recovery | Player decision it changes | Removal comparison |
| --- | --- | --- | --- |

## Evidence

- Winning trace: actions, timings, result, and actual `world.complete`/`world.failed` values.
- Counterexample: a skipped, reversed, late, louder, or unsafe action and its result.
- Counterfactuals: remove each important element from an analysis copy; compare reachability, acoustic exposure, timing, or route choice.
- Fairness: prove required clues are reachable and perceivable before the risky commitment.
- Playtest: record observed decisions and confusion. Mark unobserved human playtesting as pending.

## HTML Review

- Page path and selected level: link to the synchronized HTML review page.
- Map: actual geometry and objects, recommended and alternative routes, required action order, observation and recovery positions.
- Explanation: objective, central decision, costs of each choice, element roles, and the evidence status in readable Chinese.
- Review check: record that generated positions and routes match the current playable data, plus desktop and narrow-screen visual inspection.

`routeFor` alone cannot validate timed hazards, guard behavior, discovery, or interest. A passing bot replay is mechanical evidence, not a player success rate.
