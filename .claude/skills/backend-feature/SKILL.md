---
name: backend-feature
description: The procedure that scaffolds a new feature or resource of `apps/backend`. Use it when you add a resource or an entity to the backend.
---

# A new feature of the backend

The step-by-step procedure that adds a resource to `apps/backend`. It is a procedure, and not a reference of the architecture. `backend-architecture` routes to the page that holds each rule, and that page wins over this skill.

## The reference files

| The file | Read it when |
| --- | --- |
| [procedure.md](references/procedure.md) | You scaffold the feature. It holds the nine steps and the constraints of the project. |

## The neighbouring skills

- `backend-architecture` holds the layers, the naming, the ports and the path aliases. Invoke it first, and keep this skill for the order of the steps.
- `backend-unit-testing` holds the conventions of the specs that step 8 asks for.
