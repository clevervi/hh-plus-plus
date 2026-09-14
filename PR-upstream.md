## Two crashes on incomplete team data

Opening the league table throws and the simulator never draws. From a live
Nutaku session:

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading '9')
    at Array.map (<anonymous>)
    at SimHelpers.getSkillPercentage
    at League.extract
    at Array.forEach (<anonymous>)
    at BattleSimulatorModule.runManagedSim
    at Helpers.doWhenSelectorAvailable
```

It surfaces as an unhandled rejection rather than an error because the
leagues branch of `run()` is an `async` callback, which is why it is easy to
miss in a console that the game already fills with blocked-tracker noise.

### What breaks

**`getSkillPercentage`** reads `e.skills[id]?.skill.percentage_value ?? 0`.
The optional chain starts at `skills[id]`, so a girl who arrives without a
`skills` object throws before the `??` can apply.

**All three `extract()` paths** read the player's seven team slots directly:

```js
[0,1,2,3,4,5,6].map(key => playerTeam.girls[key].element_data.type)
```

A team of fewer than seven girls throws on `.element_data`. `League` already
reads the *opponent's* team through `if (teamMember && teamMember.element)`
thirty-five lines further down, so the player side is the odd one out. That
code also sits inside `if (!normalisedElements)`, which only runs when the
game did not send `theme_elements` — the data is already known to be short at
that point.

**`ImprovedWaifuModule`** has the same asymmetry inside one `if/else`:
favouriting allows for a girl with no stored entry, un-favouriting reads
straight through it and throws on `delete waifuInfo.girls[id].fav`. It is a
click handler, so the star flips in the UI and `saveWaifuInfo` never runs.

### What this does

A missing girl contributes nothing, which is what the `?? 0` already meant
for a girl missing that one skill. Nothing is invented: a team with no
`girls` array yields no elements and no multiplier instead of throwing.

The slot reading moves into `SimHelpers.getTeamElementTypes` so the guard
lives once instead of being repeated in `League`, `Season` and `BDSMPvE`.

Values that used to throw, checked against this branch:

| input | before | after |
| --- | --- | --- |
| girl with no `skills` object | TypeError reading `'9'` | `1.1` |
| empty team slot | TypeError reading `'skills'` | `1.25` |
| team of two girls | TypeError reading `'element_data'` | `['fire', 'water']` |
| no `girls` array | TypeError | `1` / `[]` |

Full teams are unaffected: seven girls with skills return exactly what they
returned before.

### Notes

- Source only. No version bump and no rebuilt `dist/`, since the README puts
  those in the release step and they are yours to run.
- Also drops a stray semicolon on the `getSkillPercentage` line that
  `.eslintrc.yaml` forbids.
- Found while running a fork of this script. That fork also carries unrelated
  build and tooling changes which are deliberately **not** part of this PR —
  these two commits are only the crash fixes, and they are separate so you can
  take one without the other.

Thanks for maintaining this.
