# Operations

## The metrics of the configuration of the agents

A change of `CLAUDE.md`, a skill, an agent or an OpenSpec profile ships no feature, so the usual
release notes say nothing about it. `AGENTS-CHANGELOG.md`, at the root of the repository, closes
that gap: it records each change of the configuration of the AI, the reason for the change, and its
effect on the consumption of tokens. A change of that configuration carries an entry in this file.

The workflow `.github/workflows/pr-agents-changelog.yml` enforces that rule. It starts on a Pull
Request against `main` that touches one of those three paths. It compares the branch against the base
of the Pull Request, and it fails when the list of the changed files holds one of those paths and
holds no change of `AGENTS-CHANGELOG.md`. A Pull Request that touches none of the three paths never
starts the workflow.

The report of an entry holds two costs, and never one alone.

| The cost | What it measures |
|---|---|
| The static cost | The tokens of the files that load on every session: `CLAUDE.md`, the output style, the frontmatter of every agent and every skill, `.claude/settings.json`, and the index of the memory. |
| The on-demand cost | The tokens of the body of a skill, of a card of `.claude/rules/`, and of a page of `docs/` or `openspec/`, which load only when an agent opens them. |

A change that moves text out of `CLAUDE.md` and into a skill lowers the static cost, and it raises
the on-demand cost of a turn that opens that skill. A report of one column alone hides that trade,
and it can present a false gain. So the two columns always travel together.

The script `scripts/agents-metrics.sh` gives the numbers of an entry. It offers three commands.

| The command | Its result |
|---|---|
| `static` | The token count of each file that loads always, the token count of each body that loads on demand, and the two totals. |
| `sessions --branch <name>` | The aggregate of the past transcripts of Claude Code: the turns, the tokens, the ratio of the cache, and a share of the tokens of the subagents, per branch. |
| `entry` | The block of Markdown of `AGENTS-CHANGELOG.md`, with the numbers already filled. |

The script counts a token with the endpoint `count_tokens` of the API of Anthropic. The endpoint is
free, but it needs an account with credit; a key with no credit answers
`400 invalid_request_error`, "Your credit balance is too low". Until the account of this repository
holds credit, every command runs with the flag `--estimate`, which divides the character count by
3.7 and marks each number with a tilde, e.g. `~4,234 tokens`.

**The day the account holds credit.** Once the account holds credit and the exact count becomes
possible, the entries that already carry an estimate stay as they are. Each entry records what the
project knew on the day of that change, and a later recount would replace that record with a
number that the project did not have that day. The first entry with an exact count states, in its
own text, that the method changed from the estimate to the endpoint. No agent recounts a past
entry against the files of today.

The column `subagents` of the command `sessions` reads `0.00` on every branch today, because no
transcript of this project holds the field `isSidechain` that marks a turn of a subagent. Read that
column as unconfirmed, and never as a measure of the work of the subagents.

The endpoint needs the credential `ANTHROPIC_API_KEY`. The script reads it from the environment
first, and it falls back to the file `.dev/.env`, at the root of the repository, in the shape:

```sh
ANTHROPIC_API_KEY=sk-ant-...
```

The rule `.dev` at line 40 of `.gitignore` excludes the whole folder `.dev/` from Git. So a file
`.dev/.env.example` would never reach another developer; the repository holds no such file, and this
page names the variable and its path instead.
