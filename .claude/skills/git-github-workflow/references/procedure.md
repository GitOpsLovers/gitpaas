# The procedure of the delivery

Every command runs through `rtk`, as `CLAUDE.md` requires.

1. **Branch from the latest `main`.** If the current branch fits the task and is not `main`, reuse it. If not, run `rtk git checkout main`, `rtk git pull --rebase`, then `rtk git checkout -b <type>/<description>`.
2. **Read the working tree.** Run `rtk git status --short` and `rtk git diff --stat` in one call.
3. **Stage the intended paths alone.** Run `rtk git add <paths>`. Never run `git add -A` when the tree holds an unrelated change. Report the unexpected file instead of staging it.
4. **Commit.** Run `rtk git commit -m "type(scope): subject" -m "<body>"`. The ambient Git configuration of the developer gives the author.
5. **Push.** Run `rtk git push -u origin <branch>`.
6. **Open the Pull Request.** The Pull Request carries a title alone, and no body:

   ```
   rtk gh pr create --base main --head <branch> --title "type(scope): subject"
   ```

7. **Stop.** Never merge the Pull Request. A human reviews it.
