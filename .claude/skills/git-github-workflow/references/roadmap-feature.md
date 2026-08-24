# The three extra rules of a feature of the roadmap

A task that changes behavior carries a folder at `docs/roadmap/<feature>/`. If the prompt names one, add these three rules to the procedure. If the prompt names none, skip this section.

1. **Step 1 — name the branch after the feature.** The feature `add-remember-me` gives the branch `feat/add-remember-me`. Keep the name unaltered, and pick the type by the kind of work. One phase gives one branch, so the subject of the commit names the phase.
2. **Step 3 — stage the folder of the feature with the code.** Add `docs/roadmap/<feature>/`, so the tasks and the code enter the repository in the same commit. A later commit stages the folder again only if a file of it changed. The last phase deletes that folder and writes `docs/business/`; stage the deletion and the new page together.
3. **Step 4 — read `TODO.md` for the body of the commit.** Read it; never edit it. The body names the feature and the phase, because the Pull Request carries no body.
