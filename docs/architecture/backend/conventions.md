# Conventions

## Ports and dependency injection

The repositories and the other collaborators obey the **port and adapter** pattern:

- **Port**: a plain `interface` (for example, `ProjectsRepository`). Its methods are arrow-function properties written in domain terms: they accept and return domain models and DTOs, and never ORM types or vendor types. A use case depends only on this interface.
- **Adapter**: an `@Injectable()` class that has `implements` for the port (for example, `DatabaseProjectsRepository`) of a `repositories/` interface
- **Wiring**: the module puts the **concrete class** in its `providers`. The consumer injects the dependency **by class** (`@Inject(DatabaseProjectsRepository)`, with `import type` for the port) and gives it the type of the **port**.

## Transformers

An infrastructure repository must not return a raw ORM entity or a vendor shape. The mapping stays in an adjacent `*.transformer.ts` file. The file exports plain functions that change a persistence shape or a vendor shape into a domain model, for example `to<Model>(...)`. A different function in the same file does the opposite operation. The repositories call these functions where necessary (`rows.map(toProject)`). This rule applies to all the types of infrastructure.

## Persistence

- The TypeORM connection is configured one time in `CoreModule` with `forRootAsync`. The features call only `forFeature`. Thus there is no central list of the entities.
- The entities have the `@Entity('<plural_snake_case>')` decorator. They use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`), which the domain model shows as `id: string`.
- `synchronize` is enabled only in the development environment. In production, the infrastructure migration system is used.
- Almost all the infrastructure entities have a related model in the domain layer. Each entity shows the business model as it is written into a persistence system.

## Validation

A schema of `@gitpaas/contracts` is the authoritative input contract of a body. `ZodValidationPipe` (`core/ui/pipes/zod-validation.pipe.ts`) binds the schema to the parameter, for example `@Body(new ZodValidationPipe(createProjectSchema))`. `z.strictObject` refuses a property that the schema does not declare. The pipe raises the bad request with an array of messages, so the envelope of the error does not change.

`domain/dtos/` keeps the internal shapes that pass between the layers, and it holds no shape of the wire. `create-project-in-namespace.dto.ts` is an example: a repository port reads it, and no controller binds it to a request.

A value of a path keeps its own pipe: `ParseUUIDPipe` and `ParseIntPipe` bind one identifier, and a schema of the package validates only a body or a query with more than one field.

## HTTP and REST

The global route prefix is `api/v1`. The listen port comes from `getOrThrow('PORT')` and has no default value in the code. CORS uses credentials and permits only the allowlist that is read from the necessary `CORS_ORIGIN` variable. A controller declares only the path of its resource (`@Controller('services')`). A resource that never exists outside its parent nests its path instead: the `projects` controller declares `@Controller('namespaces/:namespaceId/projects')`, because a project belongs to exactly one namespace.

| Method & path | Notes                                               |
|---------------|-----------------------------------------------------|
| `GET /`       | list (optionally filtered via cleaned query params) |
| `GET /:id`    | 404 when missing                                    |
| `POST /`      | `@Body()` create DTO                                |
| `PUT /:id`    | `@Body()` update DTO; 404 when missing              |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing                  |

The `:id` segment connects with `@Param('id', ParseUUIDPipe)`. The canonical not-found pattern is a domain error thrown inside the use case: it throws the feature's `<Entity>NotFoundError`, and the controller's `catch` block turns it into a `404` with `throw translateError(error)`. The domain never throws an HTTP exception; only the canonical pattern keeps that rule.

## Imports

- **Path aliases**: the aliases are defined in `tsconfig.json`. `@core/*` points to `./src/core/*`, `@features/*` points to `./src/features/*` and `@shared/*` points to `./src/shared/*`. Use the aliases for the imports between features and for the core and shared imports. Use relative paths in one feature.
