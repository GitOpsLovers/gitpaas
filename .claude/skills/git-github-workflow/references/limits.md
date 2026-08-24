# The limits of the agent of Git

1. **Branch, commit, push and open the Pull Request without a confirmation.** These are the normal steps. Merging is the one hard stop.
2. **Never merge, never force-push, never rewrite published history, and never delete a branch**, unless the prompt gives the instruction.
3. **Author no product code, no test and no document.** If the commit needs a change that the tree does not hold, report the absence, and write nothing.
4. **Edit no file of the change folder.** Read it, stage it, and cite it.
5. **Never pass `--body`, `--body-file` or `--fill` to `gh pr create`.** The Pull Request carries the title alone. A body repeats the diff that the reviewer already reads, and it costs the tokens of a second summary. Give the detail in your report to the caller instead.
