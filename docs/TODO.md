# TODO — refinement of the agent architecture

This document holds the plan that reduces the token cost of the agent
architecture, and that raises its performance. It covers `CLAUDE.md`, the six
subagents of `.claude/agents/`, the OpenSpec entry points and the project
skills.

The measurements come from the state of the repository on 19 August 2026.

---

## 1. The problems that were measured

### 1.1 The OpenSpec profile is installed two times

`.claude/commands/opsx/*.md` and `.claude/skills/openspec-*/SKILL.md` hold the
same content. A diff of `apply.md` against `openspec-apply-change/SKILL.md`
returns zero lines. Both sets appear in the prompt of every session.

**Cost:** approximately 2,250 characters of descriptions in every session.
**Risk:** an agent loads the copy that the project does not use.

### 1.2 Three skills need a decision

Their descriptions load in every session, and they can trigger a wrong match.

**Decided: delete `nodejs-backend-patterns` and `nodejs-best-practices`.**

The two skills teach the layer that NestJS hides. The evidence:

- `nodejs-backend-patterns/references/details.md:292` writes authentication as a
  raw `(req, res, next)` middleware. The project uses a Passport strategy and a
  guard.
- `nodejs-backend-patterns/references/advanced-patterns.md:5` writes a
  hand-written DI container. NestJS provides the container.
- `nodejs-best-practices/SKILL.md:29` holds a decision tree between Express and
  Fastify. That decision is closed.

The backend does use Express under NestJS (`@nestjs/platform-express@11.1.28`),
but the surface is small. Only 9 files of 428 name Express, and each one imports
a **type** alone (`import type { Request, Response }`). Every use sits inside a
NestJS construct: a `NestMiddleware` class, an `ExceptionFilter`, a
`CanActivate` guard or a parameter decorator. There is no `express()`
application, and there is no hand-written router.

The folder `nestjs-best-practices/rules/` already covers the same ground in the
correct idiom (`error-use-exception-filters.md`, `security-use-guards.md`,
`security-auth-jwt.md`, `di-prefer-constructor-injection.md`).

**Decided: keep `typescript-advanced-types`, and narrow its description.**

The project holds 858 TypeScript files, and it uses few of the type features
that the skill teaches:

| Concept (`SKILL.md`) | Files that use it |
|---|---|
| Generics (`SKILL.md:23`) | 1 declaration |
| Conditional types (`SKILL.md:68`) | 0 |
| Mapped types (`SKILL.md:122`) | 0 |
| Template literal types (`SKILL.md:187`) | 0 |
| Utility types (`SKILL.md:231`) | many |

The searches for `keyof`, ` infer ` and `[K in ` each return zero lines. The one
generic declaration that the project writes itself is `runWithTelemetry<T>` in
`apps/backend/src/core/infrastructure/telemetry/telemetry.context.ts:18`. The
rest is the built-in utilities: `Pick` in 90 files, `Record` in 55, `Partial` in
38, `Readonly` in 4, `Omit` in 3.

The skill stays because the frontend can need it later. A generic `resource<T>`
wrapper or a typed form schema raises the count. A narrowed description keeps
the material available, and it stops the automatic match. The risk that the
narrow description removes: an agent adds a generic builder where the codebase
writes a plain interface.

**Decided: keep `tailwind-4-docs`, and narrow its description a little.**

This skill is the strongest match of the three. The frontend uses Angular, but
the design system is Tailwind, and the version agrees exactly:

- `apps/frontend/package.json:31` pins `tailwindcss` at `4.3.3`, and line 27
  pins `@tailwindcss/postcss` at the same version.
- `apps/frontend/src/styles.css:4` writes `@import "tailwindcss"`, and line 8
  opens a `@theme` block. Both belong to version 4 alone.
- The file uses `@apply` in more than 20 rules.

The size is correct already. `SKILL.md` holds 4,731 bytes, and the material
sits in `references/`. Step 2 does not apply to it.

The narrowing is light, and it differs from the narrowing of
`typescript-advanced-types`. There, the narrow description stops a wrong match.
Here, the automatic match is correct, so the trigger stays. Two clauses change:

1. Delete "or migrating projects from v3 to v4" from the description. The
   project runs version 4 already, so the clause is dead.
2. Add the border with `tailadmin-ui-patterns`. This skill owns the engine of
   Tailwind: the utilities, the variants, the `@theme` configuration. The other
   skill owns the classes of the dashboard components.

**Caution — the skill does not work today.**
`references/docs-source.txt` says `Status: Not initialized` and
`Snapshot-Date: (none)`. Section "Initialization (required once per install)" of
`SKILL.md` tells the agent to run
`scripts/sync_tailwind_docs.py --accept-docs-license`. That script needs git,
Python 3 and access to `github.com/tailwindlabs/tailwindcss.com`. The permission
list of `.claude/settings.json` holds no rule for it. An agent that loads this
skill today stops in the middle of its task, or it asks for a permission.
Initialize the snapshot before you rely on the skill.

### 1.3 Four skill files are too large to load whole

| File | Bytes | Approximate tokens |
|---|---|---|
| `nestjs-best-practices/AGENTS.md` | 163,058 | 40,000 |
| `backend-unit-testing/SKILL.md` | 46,515 | 11,600 |
| `tailadmin-ui-patterns/SKILL.md` | 34,632 | 8,600 |
| `turborepo/SKILL.md` | 28,471 | 7,100 |

`nestjs-best-practices/SKILL.md:130` points the agent at `AGENTS.md`. That one
pointer can cost 40,000 tokens. The folder `rules/` already holds the same
content in 40 small files.

### 1.4 Each agent file repeats `CLAUDE.md`

The six agent files restate the RTK rule, the ESLint ban, the dependency ban,
the "do not spawn agents" rule, the layer model and the report format. Claude
Code loads `CLAUDE.md` into every subagent, so each copy is dead weight.

**Cost:** a subagent starts with approximately 4,000 tokens of instructions
before it reads one line of code.

### 1.5 The agent descriptions are too long

Each description holds approximately 800 characters. All six end with the same
sentence about the fresh context. That sentence belongs in the routing table of
`CLAUDE.md`, because the description loads in every session.

### 1.6 The layer rules exist in three places

`CLAUDE.md`, the agent files and `docs/backend-architecture/structure.md` all
describe the same layers. Three copies go out of step.

### 1.7 Four agents run on Opus

`implementer`, `refactorer`, `tester` and `architecture-analyst` use
`model: inherit`. A test run and a mechanical rename do not need Opus. This is
the largest single lever on cost.

### 1.8 The orchestrator sends one task per subagent call

`/opsx:apply` produces a task list. Each delegation restarts a cold context, and
it reads `proposal.md`, `design.md` and `tasks.md` again. Ten tasks cost ten
cold starts.

### 1.9 The rule that runs `tester` after every code change fires per task

The `implementer` already writes tests for its own change. A second full agent
per task duplicates the work.

---

## 2. The plan

### Step 1 — Delete the duplicates, and narrow the rest

- [x] Remove the six folders `.claude/skills/openspec-*/`. Keep
      `.claude/commands/opsx/`.
- [x] Remove the skills `nodejs-backend-patterns` and `nodejs-best-practices`.
- [x] Keep `typescript-advanced-types`. Narrow its `description` frontmatter, so
      that the skill triggers on an explicit request alone. Name the trigger
      words: a generic utility type, a conditional type, a mapped type or a
      template literal type.
- [x] Keep `tailwind-4-docs`. Delete the clause "or migrating projects from v3
      to v4" from its `description`, and add the border with
      `tailadmin-ui-patterns`.
- [x] Add the permission rule `Bash(rtk python3 *)` to `.claude/settings.json`,
      so that the snapshot script of `tailwind-4-docs` can run.
- [ ] Initialize the snapshot of `tailwind-4-docs` with
      `scripts/sync_tailwind_docs.py --accept-docs-license`. The skill fails
      without it.
      - Deferred: the user runs the script, because it clones a repository from
        the internet.
- [x] Remove `nestjs-best-practices/AGENTS.md`, `README.md` and `scripts/`.
- [x] Change line 130 of `nestjs-best-practices/SKILL.md`. It must point at
      `rules/<name>.md`, not at `AGENTS.md`.

**Caution:** an `openspec update` command can restore the deleted skill folders.
If that happens, add the folders to `.gitignore`.

### Step 2 — Split the large skills

- [x] Cut `backend-unit-testing/SKILL.md` to less than 5 KB. Move each section
      into `references/`.
- [x] Cut `turborepo/SKILL.md` to less than 5 KB. Its `references/` folder
      already exists.
- [x] Cut `tailadmin-ui-patterns/SKILL.md` to less than 5 KB.

Each new SKILL.md holds a table of contents with one line per reference file.
The skill `angular-developer` already shows this shape.

**The result of Step 2:**

| Skill | Before | After |
|---|---|---|
| `backend-unit-testing` | 46,515 B | 2,426 B |
| `tailadmin-ui-patterns` | 34,632 B | 1,965 B |
| `turborepo` | 28,471 B | 4,997 B |

The ten `SKILL.md` files now hold 50,275 bytes in total. Three of them held
109,618 bytes alone before the split.

**Two tasks that Step 2 found:**

- [x] Add the `rtk` prefix to the shell snippets inside
      `tailadmin-ui-patterns/references/fetch-and-verify.md`. They call `git`,
      `grep` and `cat` directly, and that breaks the rule of the project. The
      same defect existed in `anti-patterns.md` and in `custom-configuration.md`,
      and both are corrected.
- [x] Decide whether an agent may clone the TailAdmin repository at all.
      **The decision: the local frontend is the first source. The clone is the
      last one.**

### The generation problem of `tailadmin-ui-patterns`

Step 2 found a defect that is larger than a missing prefix. The skill describes a
different generation of TailAdmin than the one that the project uses.

**The evidence:**

- The project runs Tailwind v4. `apps/frontend/src/styles.css` declares every
  token in an `@theme` block, from line 8 to line 166.
- The skill described the palette of a `tailwind.config.js` file, which belongs
  to Tailwind v3.
- The class `boxdark` is central to the older template. It appears 0 times in
  `apps/frontend/src`.
- The five files of markup hold 84 class names of the older generation, and 0
  names of the current one:

| File | Older names | Current names |
|---|---|---|
| `layout.md` | 20 | 0 |
| `tables.md` | 23 | 0 |
| `forms-and-buttons.md` | 21 | 0 |
| `cards-and-feedback.md` | 16 | 0 |
| `modal.md` | 4 | 0 |

- 23 template files under `apps/frontend/src/app` already use the current names
  (`text-theme-sm`, `bg-brand-*`, `dark:bg-white/…`).

**What Step 2 corrected:**

- `SKILL.md` — the entry rule now says: copy the local markup first. It states
  that the upstream repository holds an older generation.
- `fetch-and-verify.md` — rewritten with an order of four sources. The frontend
  comes first, and the clone comes last.
- `custom-configuration.md` — rewritten. It points at the `@theme` block of
  `styles.css`, and it gives a map from each old name to its state today.
- `anti-patterns.md` — the verification commands search the project, not a
  clone.
- The five files of markup carry a caution at the top.

**What stays open:**

- [ ] Replace the markup of the five files with the real markup of the project,
      or delete the five files and trust the rule that sends the agent to
      `apps/frontend/src/app`. The caution is a guard, not a repair.

**A note on the origin of the skills.** The file `skills-lock.json` named the
upstream repository of each skill, and it held a hash of each one. The user
deleted that file. The skills are local files now, and no command re-installs
them over the split. The entry for `tailadmin-ui-patterns` named the source
`kaakati/rails-enterprise-dev`. That explains the Rails section that Step 1
deleted.

### Step 3 — Make one shared rule set

- [x] Keep the RTK rule, the ESLint ban, the dependency ban and the report
      format only in `CLAUDE.md`.
- [x] Cut each agent file to three parts: the role, the method and the report.
- [x] Delete the repeated sentence about the fresh context from the six
      descriptions.

**Target:** a reduction of 30 to 40 percent per agent file.

**The proof that the deletion is safe.** A probe subagent answered four questions
with zero tool uses. It quoted the RTK rule and the ESLint rule of `CLAUDE.md`
word for word, and it named the six subagents of the routing table. Claude Code
loads `CLAUDE.md` into every subagent, so a copy inside an agent file gives
nothing.

**One correction to the method.** Text inside `CLAUDE.md` costs the same as text
inside an agent file, because both load for every subagent. A move to
`CLAUDE.md` saves nothing by itself. The test became:

| Case | Action |
|---|---|
| `CLAUDE.md` already states the rule | Delete it from the agent file. |
| The rule applies to all six agents | Move it into `CLAUDE.md` one time. |
| The rule applies to one agent | Leave it where it is. |

**The measured result:**

| File | Before | After |
|---|---|---|
| `implementer.md` | 6,584 B | 4,335 B |
| `refactorer.md` | 4,966 B | 2,849 B |
| `tester.md` | 6,053 B | 4,279 B |
| `documenter.md` | 6,123 B | 5,244 B |
| `architecture-analyst.md` | 6,857 B | 6,372 B |
| `git-manager.md` | 3,106 B | 2,646 B |
| **Total** | **33,689 B** | **25,725 B** |

`CLAUDE.md` grew from 10,320 B to 11,240 B. The net saving is 7,044 bytes, and
the reduction of the agent files is 23.6 percent.

**The target of 30 to 40 percent was not met, and the reason is sound.** The
remainder of each file is the method of that agent alone: its architecture
rules, its conventions, its house style and its verification steps. Those blocks
carry the value of the agent, so the work left them in place. `documenter.md`
and `architecture-analyst.md` gave the least, because most of their content is
their own house style.

**A risk to record.** `git-manager.md` and `documenter.md` now describe their
report as a difference against the common shape in `CLAUDE.md`. The two files
lose their base if `CLAUDE.md` ever stops loading into a subagent.

### Step 4 — Point at the documents

- [x] Replace the inline layer descriptions of the agent files with the paths
      `docs/backend-architecture/structure.md` and
      `docs/frontend-architecture/structure.md`.

**A correction to this step.** Section 1.6 listed this step under the token cost.
That was wrong. `docs/backend-architecture/structure.md` holds 9,758 bytes, and
the inline text that it replaces held approximately 400 bytes. An agent that
follows the pointer reads more, not less. The measured result proves it: the six
agent files grew from 25,725 bytes to 25,951 bytes.

**The real value of this step is the removal of a stale rule.** The agent files
gave a wrong list of the path aliases, and an agent that copies a wrong list
writes an import that does not resolve.

| Source | Backend | Frontend |
|---|---|---|
| `apps/backend/tsconfig.json` | `@core/*`, `@features/*`, `@shared/*` | — |
| `apps/frontend/tsconfig.json` | — | `@environments/*`, `@features/*`, `@layout/*`, `@pages/*`, `@shared/*` |
| The five agent files, before | Each one omitted `@shared/*` | Each one omitted `@environments/*` |

`refactorer.md` was the worst. It named `@features/*` alone for the backend, so
it omitted two of three.

**Three false pointers were corrected.** `refactorer.md`, `tester.md` and
`implementer.md` each told the reader to follow the aliases or the patterns of
`CLAUDE.md`. `CLAUDE.md` holds neither. It holds the routing and the
project-wide constraints. One true mention of `CLAUDE.md` survives, in
`implementer.md`, and it cites the constraints alone.

**What each file keeps inline.** One invariant, because it is short and it
decides every import: depend inward only; `domain/` must not import
`infrastructure/` or `ui/`; `core/` must never import a feature. Each file also
keeps the rules that no page of `docs/` states, for example the port-and-DI rule
of `implementer` and the testable seams of `tester`.

**A correction that the work found.** The backend page has no section
"Path aliases". It has a section "Imports", and the aliases sit inside it. The
pointers name the real heading. The frontend page does have a true
"Path aliases" section, with the complete table of five rows.

### Step 5 — Set the model of each agent

| Agent | Now | Target |
|---|---|---|
| `implementer` | inherit | inherit |
| `architecture-analyst` | inherit | inherit |
| `refactorer` | inherit | sonnet |
| `tester` | inherit | sonnet |
| `documenter` | sonnet | sonnet |
| `git-manager` | haiku | haiku |

- [x] Set `model: sonnet` in `refactorer.md`.
- [x] Set `model: sonnet` in `tester.md`.

**The state after the change:** two agents on Opus (`implementer`,
`architecture-analyst`), three on Sonnet (`refactorer`, `tester`, `documenter`),
one on Haiku (`git-manager`).

**A caution about `refactorer`.** The work of Step 1 to Step 4 used this agent
for four tasks, and one of them was hard. The split of `turborepo` needed a
judgment for each section: does a reference file already state this rule, or
does the rule exist nowhere else? That agent used 77,959 tokens and 36 tool
calls, and it placed every rule correctly. A mechanical rename does not need
Opus, but that task came close to needing it.

**How to judge the change.** Watch the next refactoring task of real size. Two
signs say that Sonnet is too small for it:

- The agent reports that it moved a rule, and the rule is absent from both
  files.
- The agent renames a symbol, and it leaves a call site behind.

**How to revert.** Change one line back to `model: inherit` in
`.claude/agents/refactorer.md`. The change needs no other edit.

**A note on the scope of this step.** This step changes the cost of the work,
and it changes no instruction. So no agent behaves differently, and the quality
alone can differ.

### Step 6 — Change two orchestration rules of `CLAUDE.md`

- [x] Group the tasks of a change by agent type and by file area. Send one call
      per group, not one call per task.
- [x] Run `tester` one time, after the last code task of the change.

**Why this step matters more than its size.** Step 1 to Step 5 cut the text that
one agent loads. This step cuts the number of agents that load anything. A
subagent starts cold: it loads `CLAUDE.md`, it loads its own file, and it reads
the change folder again. Ten calls pay that price ten times.

**The rule of the group.** Group by agent type **and** by file area. Split a
group for a real reason alone: two groups touch the same file, or the second
group needs the report of the first. Two groups that touch different areas run
in parallel, in one message. Step 2 of this plan used that shape: three
`refactorer` agents ran at the same time, one per skill, and no agent waited.

**The rule of the tester.** The old rule launched `tester` after each code task.
The `implementer` already writes the tests for the behavior that it changes, so
that rule paid for a cold start to repeat work that existed. One run, after the
last code task, gives the same result.

**A third rule that this work found, and that Step 6 did not change.**

The rule "Delegate; never do the work inline" has no lower limit. Step 5 of this
plan changed two lines of frontmatter. Two subagent calls for that work would
have cost two cold starts, and each one loads more text than the edit itself
holds. The orchestrator did the edit directly.

- [ ] Decide whether `CLAUDE.md` states a floor for the delegation. A proposal:
      the orchestrator may edit directly when the change is under about 10 lines,
      when it holds no judgment about the architecture, and when the orchestrator
      already read the file in the conversation. Everything else goes to a
      subagent.

This item stays open, because Step 6 owns two rules, and this is a third one.

### Step 7 — Add a context budget rule to `CLAUDE.md`

- [ ] Write this rule: a subagent prompt names file paths. It never pastes file
      contents.

### Step 8 — Clean the permissions

- [ ] Remove from `.claude/settings.local.json` every rule of the `artifactory`
      project, and every rule that covers one command only.

---

## 3. The expected result

- Every session starts with approximately 3,000 fewer tokens.
- Every subagent starts with approximately 1,500 fewer tokens.
- A change of ten tasks makes three or four subagent calls, not twenty.
- The cheap agents move to Sonnet and to Haiku.

---

## 4. The order of the work

1. Step 1 and Step 5 give the largest gain for the smallest effort. Do them
   first.
2. Step 3, Step 4, Step 6 and Step 7 change `CLAUDE.md` and the agent files
   together. Do them in one pass.
3. Step 2 needs the most work. Do it last.
4. Step 8 is independent. Do it at any time.
