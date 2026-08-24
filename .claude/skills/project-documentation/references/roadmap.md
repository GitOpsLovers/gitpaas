# The area `docs/roadmap/`, and the three files of a feature

### The roadmap

`docs/roadmap/<feature>/` holds one future feature, and it is the working folder of the cycle of the specification-driven development. `docs/roadmap.md` is its index. The folder holds three files.

| The file | It holds | Who writes it |
|---|---|---|
| `TODO.md` | Why the feature matters, what must change, what stays out of scope, and what it touches | The user, or the orchestrator |
| `research.md` | What the system does today, which pages of the business the feature changes, which options exist, and what stays unknown | `researcher` |
| `plan.md` | The decisions, the option that each one refused, the rules that the feature adds, and the phases with their tasks | The orchestrator |

`plan.md` holds three parts, in this order.

1. **The decisions.** Each one names the option that it refused, and the reason.
2. **The rules that this feature adds.** One section for one capability, written in the shape of a page of the business, with `SHALL` and with a scenario for each case. This part is the contract of the feature: `tester` derives its cases from it, and `documenter` moves it into `docs/business/` in the last phase.
3. **The phases.** One phase for one Pull Request.

A phase takes this shape:

```markdown
### Phase <n> — <the subject>

**Agent:** implementer
**Paths:** apps/backend/src/features/<feature>/
**This is the last phase.**          (on the last phase alone)

- [ ] <n>.1 <one task that an agent can verify>
```

The last phase always goes to `documenter`, and it writes the behavior into `docs/business/`, corrects the pages that the feature made false, and deletes the folder of the roadmap.

When the last phase merges, the folder goes away. So `docs/roadmap/` holds the future alone, and `docs/business/` holds the present.
