# The area `docs/roadmap/`, and the one file of a feature

### The roadmap

`docs/roadmap/<feature>/` holds one future feature, and it is the working folder of the cycle of the specification-driven development. `docs/roadmap.md` is its index. The folder holds **one file, `TODO.md`**, and no other file. There is no `research.md`, and there is no `plan.md`.

| The file  | It holds                                               | Who writes it                                               |
|-----------|--------------------------------------------------------|-------------------------------------------------------------|
| `TODO.md` | A short introduction, then the phases with their tasks | The user seeds it; the orchestrator rewrites it at the plan |

### The shape of `TODO.md`

The file holds two parts, in this order, and nothing else.

1. **The introduction.** Six sentences at the most: the problem, what the feature does about it, and what stays out of scope. Write no analysis, no option, no citation of a line of code. The research lives in the conversation, and not in this file.
2. **The phases.** One phase for one Pull Request. Each task is one line with a check box, and an agent can verify it.

```markdown
# <the feature>

<The problem, in one or two sentences.>
<What we do about it, in one or two sentences.>
<What stays out of scope, in one sentence.>

## Phase 1 — <the subject>

**Agent:** implementer
**Paths:** apps/backend/src/features/<feature>/

- [ ] 1.1 <one task that an agent can verify>
- [ ] 1.2 <one task that an agent can verify>

## Phase 2 — <the subject>

**Agent:** documenter
**This is the last phase.**

- [ ] 2.1 <one task that an agent can verify>
```

Keep the whole file under 100 lines. If a phase needs more than about eight tasks, split it into two phases.

The last phase always goes to `documenter`, and it writes the behavior into `docs/business/`, corrects the pages that the feature made false, and deletes the folder of the roadmap.

When the last phase merges, the folder goes away. So `docs/roadmap/` holds the future alone, and `docs/business/` holds the present.
