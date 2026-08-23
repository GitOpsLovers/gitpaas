# The plan of the changelog of the agents

This page holds the plan for `AGENTS-CHANGELOG.md`, a file that records each change of the AI
configuration of GitPaaS, and the effect of that change on the consumption of tokens.

This is a plan, and not a description of the code. When the three phases end, the content moves into
`docs/monorepo-architecture/operations.md`, and this page goes away.

---

## 1. The goal

`CHANGELOG.md` tells a human what each release holds. It carries no line about the configuration of
the agents, because that configuration ships no feature. So today the project changes `CLAUDE.md`, a
skill or an agent, and no record states what the change tried to improve, or whether it improved it.

`AGENTS-CHANGELOG.md` closes that gap. It answers two questions for each change:

1. What did we change in the configuration, and why?
2. Did the change lower the cost of the tokens, or did it raise it?

## 2. The classification of the work

The work adds a document, a script and a rule. It touches no file under `apps/`, so it changes no
product behavior. Two exceptions of the skill `agent-orchestration` apply: a documentation edit, and
a configuration edit. So the work needs no OpenSpec change, and it starts at step 4 of the workflow.

## 3. The two costs

A raw total of tokens per session is not comparable, because each session holds a different task.
The noise of the task hides the effect of the change. So the plan separates two numbers.

| The number | What it measures | Its quality |
|---|---|---|
| The static cost | The tokens that every session loads, before the first word of the user. | Exact, and reproducible. |
| The observed cost | The tokens that the real sessions spent, per branch. | Noisy, but real. |

### 3.1 The static cost

The static cost is the honest measure of an optimization, because it holds no noise. These files
load on every turn:

- `CLAUDE.md`
- `.claude/output-styles/asd-ste100.md`
- The name and the description of the six agents of `.claude/agents/`
- The name and the description of the thirteen skills of `.claude/skills/`
- `.claude/settings.json`
- The index of the memory, `MEMORY.md`

The body of a skill, a page of `docs/` and a file of `openspec/` load on demand. So the report gives
a second column, **the on-demand cost**.

> **Caution.** The two columns must appear together. A change that moves text from `CLAUDE.md` into
> a skill lowers the static cost, and it raises the cost of each turn that opens the skill. One
> column alone reports a false victory.

### 3.2 The observed cost

The transcripts of Claude Code hold the data, under
`~/.claude/projects/-Users-mcfdez-Desarrollo-GitOpsLovers-gitpaas/`. That folder holds one file of
type `.jsonl` per session. Each message of the assistant carries these fields:

| The field | It holds |
|---|---|
| `usage.input_tokens` | The tokens of the prompt that missed the cache. |
| `usage.output_tokens` | The tokens of the answer, with the tokens of the thought. |
| `usage.cache_read_input_tokens` | The tokens that the cache served. |
| `usage.cache_creation_input_tokens` | The tokens that the request wrote into the cache. |
| `message.model` | The model of the turn. |
| `gitBranch` | The branch of the working tree at the time of the turn. |
| `isSidechain` | The value `true` marks a turn of a subagent. |
| `sessionId`, `timestamp` | The identity and the time of the session. |

The field `gitBranch` gives the unit of comparison. The project delivers one phase per branch and
per Pull Request, so the tokens of a branch compare one phase against another phase.

## 4. The deliverables

### 4.1 The file `AGENTS-CHANGELOG.md`

The file sits at the root, beside `CHANGELOG.md`. A human writes the reason, and the script gives
the block of the metrics. The file follows the style of Keep a Changelog. One entry holds this
shape:

```md
## [Unreleased]

### 2026-08-23 - Compact the description of the six subagents
**Scope:** `.claude/agents/*.md`
**Why:** three descriptions repeated a rule of `CLAUDE.md`.
**Static context:** 41,204 -> 38,910 tokens (-2,294 / -5.6 %)
**On-demand:** unchanged
**Observed:** branch `feat/log-retention-p5`: 412k -> 388k, cache hit 0.91 -> 0.93
**Risk:** the `refactorer` may take a task of the `implementer`.
```

### 4.2 The script `scripts/agents-metrics/index.mjs`

The script runs on Node 26, and it needs no new dependency. It offers three commands.

| The command | Its result |
|---|---|
| `static` | The token cost of each file that loads always, the on-demand cost, and the two totals. |
| `sessions --branch <name>` | The aggregate of the transcripts: the tokens, the ratio of the cache, the count of the turns, and the share of the subagents. |
| `entry` | The block of Markdown of section 4.1, ready for the changelog. |

#### The count of the tokens

The script counts the tokens with the endpoint `count_tokens` of the API of Anthropic
(`POST /v1/messages/count_tokens`). The endpoint is free, and it holds a limit of 2,000 requests per
minute at the tier Start. One run of the command `static` sends about 25 requests, one request for
one file. So the limit constrains nothing.

The script calls the endpoint over HTTPS, with the client `fetch` of Node. It installs no
dependency.

> **Caution.** The endpoint is free, but it needs an account with credit. A key of an organization
> with a balance of zero answers `400 invalid_request_error`, with the message "Your credit balance
> is too low". So the exact count needs a purchase of credit, and the flag `--estimate` gives the
> only report until then.

The count depends on the model, because two models hold two tokenizers. So the script always passes
`claude-opus-5`, and the entry of the changelog records that identifier. A comparison stays valid
only when both sides use the same model.

#### The credential

The key lives in `.dev/.env`, at the root of the repository:

```sh
ANTHROPIC_API_KEY=sk-ant-...
```

The script loads that file with `process.loadEnvFile()`, a function of Node. The function needs no
dependency, and it never overrides a variable that the shell already exports. So a key of the shell
wins over the key of the file, and the file fills the gap.

The file stays out of Git. Two rules of `.gitignore` cover it: the rule `.env` of line 8, and the
rule `.dev` of line 40. The command **rtk git check-ignore** confirms the second rule.

> **Caution.** The folder `.dev/` is ignored in whole, so no file of that folder reaches the
> repository. A file `.dev/.env.example` would stay invisible to another developer. So the page of
> `docs/` names the variable and its file, and phase 2 writes that section.

If the script finds no key, it stops, and it prints the path of the file and the name of the
variable. It falls back to an estimate of one token for 3.7 characters only under the flag
`--estimate`, and it marks each number of that report with a tilde.

The script reads the transcripts, and it never writes into them.

### 4.3 The rule, and the check

- One line in section 2 of `CLAUDE.md` asks the agent to add an entry when it changes the
  configuration of the AI.
- One job of `.github/workflows/pr-verify.yml` fails a Pull Request that changes `CLAUDE.md` or a
  file of `.claude/`, and that leaves `AGENTS-CHANGELOG.md` untouched. The file
  `.github/workflows/pr-openspec.yml` already holds this pattern of check.

## 5. The phases

One phase gives one branch, one commit and one Pull Request.

| Phase | The work | The agent | The paths |
|---|---|---|---|
| 1 | Write the script of the metrics, and record the baseline of today. | `implementer` | `scripts/agents-metrics/` |
| 2 | Create `AGENTS-CHANGELOG.md` with its first entry, and document the workflow. | `documenter` | `AGENTS-CHANGELOG.md`, `docs/monorepo-architecture/operations.md` |
| 3 | Add the rule to `CLAUDE.md`, and add the job to the workflow. | `implementer` | `CLAUDE.md`, `.github/workflows/pr-verify.yml` |

Phase 3 is the last phase.

## 6. The options that the plan refused

| The option | The reason of the refusal |
|---|---|
| Generate the file from the commits, as `semantic-release` generates `CHANGELOG.md`. | The method gives no reason and no metric. The value of this file is the reason. |
| Run a fixed set of probe prompts before and after each change. | It gives the only rigorous A/B test, but it costs a full run of tokens for each change. It stays an option for a large change alone. |
| Compare the raw total of tokens of two sessions. | The task of each session differs, so the number measures the task, and not the configuration. |
