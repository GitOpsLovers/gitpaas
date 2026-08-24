# The trees of the decision

Find your question, and read the file that the branch names. Every path is relative to `references/`.

```
Configure a task?
├─ Task keys, transit nodes → configuration/tasks.md
├─ Ready-made pipeline → configuration/recipes.md
├─ Per-package config → configuration/RULE.md#package-configurations
├─ Mistake to avoid → configuration/gotchas.md
└─ Global settings → configuration/global-options.md

Cache problems?
├─ Hash inputs → caching/RULE.md
├─ Misses or wrong hits → caching/gotchas.md
├─ Remote cache → caching/remote-cache.md
└─ Env causes misses → environment/gotchas.md

Run only what changed?
├─ Use --affected (RECOMMENDED, includes dependents)
└─ Custom base or git range → filtering/RULE.md

Filter packages?
├─ Syntax → filtering/RULE.md
└─ Combinations → filtering/patterns.md

Environment issues?
├─ Keys → environment/RULE.md
├─ Modes, inference → environment/modes.md
└─ .env and CI vars → environment/gotchas.md

CI setup?
├─ Principles → ci/RULE.md
├─ GitHub Actions → ci/github-actions.md
├─ Vercel, turbo-ignore → ci/vercel.md
├─ --affected strategies → ci/patterns.md
└─ Flags → cli/commands.md

Watch mode?
├─ turbo watch → watch/RULE.md
├─ with, interruptible → configuration/tasks.md
└─ One-shot dev scripts → configuration/recipes.md

Create or structure a package?
├─ Internal packages → best-practices/packages.md
├─ Repo layout, tsconfig → best-practices/structure.md
├─ Dependencies → best-practices/dependencies.md
└─ Types, anti-patterns → best-practices/RULE.md

Enforce boundaries?
├─ Run turbo boundaries
└─ Tags, rule types → boundaries/RULE.md
```
