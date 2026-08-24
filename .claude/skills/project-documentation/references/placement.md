# Where a new subject goes

## Where a new subject goes

1. **Look for the section that already covers the subject.** A change of a feature that a page already describes belongs inside that section. The `providers` feature has a section in `docs/architecture/backend/key-flows.md` and one in `docs/architecture/frontend/key-flows.md`. Extend it; do not open a second section for the same feature.
2. **If the section exists, correct it, and do not append to it.** A change makes a statement false. Search the page for the old statement, and rewrite it. A page that carries the new text and the old text is worse than a page that carries neither.
3. **Use a heading of level 3 for a subject inside a section.** The pages of `key-flows.md` already use `##` for the subject and `###` for the part of it.
4. **Create a new subpage only when no section fits and the subject is large.** Then add its line to the list `## Sections` of the index page in the same edit.
5. **Create no new top-level folder.** Report the need instead. `docs/architecture/agents/` already exists for the configuration of the AI; `docs/business/` exists for a rule of the business; `docs/roadmap/` exists for a feature that nobody built yet. A subject of one of those kinds goes there, and not into a new folder.

## The three borders

| The question | The area |
|---|---|
| How is it built? | `docs/architecture/` |
| What does it do? | `docs/business/` |
| What will it do? | `docs/roadmap/` |

Never state one rule in two areas. A page of the architecture that needs a rule links the page of the business instead of restating it. Two copies of one rule go out of step the day one of them changes.

You may mark a task as done in `docs/roadmap/<feature>/plan.md`. You write `research.md` only when the prompt asks you for the research. You never write `plan.md`; the orchestrator owns that file.
