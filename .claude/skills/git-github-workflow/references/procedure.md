# The procedure of the delivery

Every command runs through `rtk`, as `CLAUDE.md` requires.

1. **Branch from the latest `main`.** If the current branch fits the task and is not `main`, reuse it. If not, run `rtk git checkout main`, `rtk git pull --rebase`, then `rtk git checkout -b <type>/<description>`.
2. **Read the working tree.** Run `rtk git status --short` and `rtk git diff --stat` in one call.
3. **Stage the intended paths alone.** Run `rtk git add <paths>`. Never run `git add -A` when the tree holds an unrelated change. Report the unexpected file instead of staging it.
4. **Commit.** Run `rtk git commit -m "type(scope): subject" -m "<body>"`. The ambient Git configuration of the developer gives the author. Keep the subject that you wrote here; step 6 copies it.
5. **Push.** Run `rtk git push -u origin <branch>`.
6. **Open the Pull Request in draft.** The Pull Request carries a title alone, and an empty body, and it is always a draft. The title is the subject of the commit of step 4, copied character for character:

   ```
   rtk gh pr create --draft --base main --head <branch> --title "type(scope): subject" --body ""
   ```

   Pass `--draft` on every Pull Request that you open. A human moves it out of the draft state, and you never do it.

   Pass `--body ""` exactly, and nothing else. You run with no terminal, so `gh` stops and asks for a body when the flag is absent. The two empty quotation marks answer that question with an empty body, and they add no text to the Pull Request.

   **The body stays empty, in every case.** Write no summary, no list of the changes, no test plan, and no reference to `TODO.md`. Pass none of `--body-file`, `--fill`, `--fill-first`, `--fill-verbose`, `--template` and `--editor`. After the creation, run no `gh pr edit` and no `gh api` against the body. `limits.md` is the authority for this rule.

7. **Stop.** Never merge the Pull Request. A human reviews it.
