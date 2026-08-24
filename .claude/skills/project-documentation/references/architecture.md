# The area `docs/architecture/`

## The map

`docs/` holds three kinds of area. Find the kind first, and then find the page.

| The kind | The area | It answers |
|---|---|---|
| The architecture | `docs/architecture/` | How the system is built |
| The business | `docs/business/` | What the system does today |
| The roadmap | `docs/roadmap/` | What the system does not do yet |

### The architecture

`docs/architecture/` holds five areas. Each area is one page and one folder of the same name, and the folder holds the subpages.

| The area | It covers |
|---|---|
| `monorepo` | The repository, the packages and the pipeline of Turborepo. |
| `backend` | The NestJS application. |
| `frontend` | The Angular application. |
| `infrastructure` | The compose stacks, the installer and the server. |
| `agents` | The configuration of the AI, and not the application. |

One area takes the same set of subpages.

| The subpage         | It receives                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------------|
| `stack.md`          | The tool that answers each concern, and the version of that tool.                                 |
| `structure.md`      | The tree of the folders, the layers, the shape of a feature, and the wiring of the modules.       |
| `conventions.md`    | The rule that a developer follows: the naming, the aliases of the imports, the shape of a file.   |
| `key-flows.md`      | The path of a request through the layers, a flow of the business, and the reason of its design.   |
| `operations.md`     | The action that an operator runs on the application.                                              |
| `installation.md`   | The installer. It exists for the infrastructure alone.                                            |

`structure.md` and `conventions.md` of the two applications are the single source of the architecture. `CLAUDE.md` holds no copy of them, so a rule of the layers, of the naming or of the path aliases goes into these four pages and into no other place.

`docs/architecture/agents/` holds the configuration of the AI, and not the application: the configuration of the agents and the skills, and the workflow that they follow.
