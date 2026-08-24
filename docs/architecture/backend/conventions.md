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

`domain/dtos/` keeps the internal shapes that pass between the layers, and it holds no shape of the wire. `create-project-in-namespace.dto.ts` is an example: a repository port reads it, and no controller binds it to a request. These shapes carry no decorator now.

A value of a path keeps its own pipe: `ParseUUIDPipe` and `ParseIntPipe` bind one identifier, and a schema of the package validates only a body or a query with more than one field.

## Single-responsibility principle

In general, all files, classes, functions, and entities in the application must adhere to the Single-Responsibility Principle.

This means that, normally, an entity will be placed in its own file and should contain nothing other than that entity. If that entity needs to perform complex operations or rely on additional functions, those functions should be extracted into new entities if necessary.

Only in cases where the supporting functions are very simple and localized in nature will it be permitted to include more than one such function in a file.

## HTTP and REST

The global route prefix is `api/v1`. The listen port comes from `getOrThrow('PORT')` and has no default value in the code. CORS uses credentials and permits only the allowlist that is read from the necessary `CORS_ORIGIN` variable. A controller declares only the path of its resource (`@Controller('services')`). A resource that never exists outside its parent nests its path instead: the `projects` controller declares `@Controller('namespaces/:namespaceId/projects')`, because a project belongs to exactly one namespace.

| Method & path | Notes                                               |
|---------------|-----------------------------------------------------|
| `GET /`       | list (optionally filtered via cleaned query params) |
| `GET /:id`    | 404 when missing                                    |
| `POST /`      | `@Body()` create DTO                                |
| `PUT /:id`    | `@Body()` update DTO; 404 when missing              |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing                  |

The `:id` segment connects with `@Param('id', ParseUUIDPipe)`. **The canonical not-found pattern is a domain error thrown inside the use case**: the use case reads a `null` repository result, throws the feature's `<Entity>NotFoundError`, and the controller's `catch` block turns it into a `404` with `throw translateError(error)` (for example `projects/application/find-project-by-id.use-case.ts`). Two feature controllers still deviate from this pattern, as known drift: `namespaces` builds the domain error in the controller and passes it to `translateError` instead of throwing it from the use case, and `services` raises a raw `NotFoundException` in the controller, with no domain error at all. The domain never throws an HTTP exception; only the canonical pattern keeps that rule.

## File naming

All the backend files must obey a naming convention. The conventions are as follows:

### Domain

- **Models**: `<name>.models.ts`, where `name` is always in kebab-case. Example: `user.models.ts`.
- **Ports**: `<name>.port.ts`, where `name` is always in kebab-case. Example: `container-runtime.port.ts`.
- **Repositories**: `<name>.repository.ts`, where `name` is always in kebab-case. Example: `users.repository.ts`.
- **DTOs**: `<verb>-<name>.dto.ts`, where `verb` gives the operation (`create`, `update`) and `name` is always in kebab-case. Example: `create-project.dto.ts`.
- **Errors**: `<name>.errors.ts`, where `name` is always in kebab-case and gives the feature or the entity the error classes belong to. Example: `project.errors.ts`.
- **Constants**: `<stem>.constants.ts`, where `stem` is always in kebab-case. Example: `gitpaas-labels.constants.ts`.

### Application

- **Use cases**: `<name>.use-case.ts`, where `name` gives the purpose of the use case. Example: `get-containers-by-service.use-case.ts`.

### Infrastructure

- **Adapters**: `<technology>-<name>.adapter.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the port uses. Example: `docker-container-runtime.adapter.ts`.
- **Repository implementations**: `<technology>-<name>.repository.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the repository uses. Example: `db-users.repository.ts`.
- **Database entities**: `db-<name>.entity.ts`, where `name` is always the singular kebab-case name of the entity. Example: `db-project.entity.ts`.
- **Transformers**: `<stem>.transformer.ts`, where `stem` names the persistence or vendor shape the file converts. Example: `db-projects.transformer.ts`.

### UI

- **Controllers**: `<name>.controller.ts`, where `name` is always in kebab-case and gives the resource. Example: `projects.controller.ts`.
- **Services**: `<name>.service.ts`, where `name` is always in kebab-case and gives the feature. Example: `projects.service.ts`.
- **Guards**: `<name>.guard.ts`, where `name` is always in kebab-case. Example: `roles.guard.ts`.
- **Decorators**: `<name>.decorator.ts`, where `name` is always in kebab-case. Example: `current-user.decorator.ts`.

## Class and function naming

### Domain

- **Ports**: the name is in `PascalCase`. Example: `ContainerRuntime`.
- **Repositories**: the name is in `PascalCase`. It is the name of the entity plus `Repository`. Example: `UsersRepository`.
- **DTOs**: the name is in `PascalCase`. It is the verb, plus the name of the entity, plus `Dto`. Example: `CreateProjectDto`.
- **Errors**: the name is in `PascalCase`. It gives the condition and ends with `Error`. Example: `ProjectNotFoundError`.

### Application

- **Use cases**: the name is in `camelCase`. It gives the purpose of the use case and ends with `UseCase`. Example: `createProjectUseCase`.

### Infrastructure

- **Adapters**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Adapter`. Example: `DockerContainerRuntimeAdapter`.
- **Repository implementations**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Repository`. Example: `DatabaseUsersRepository`.
- **Database entities**: the name is in `PascalCase`. It always starts with `Db`, then it gives the name of the entity, and it ends with `Entity`. Example: `DbProjectEntity`.
- **Transformers**: the file exports plain functions, not a class. Each function is in `camelCase` and starts with `to`, followed by the name of the shape it builds. Example: `toProject`.

### UI

- **Controllers**: the name is in `PascalCase`. It is the name of the resource plus `Controller`. Example: `ProjectsController`.
- **Services**: the name is in `PascalCase`. It is the name of the feature plus `Service`. Example: `ProjectsService`.
- **Guards**: the name is in `PascalCase`. It gives the check and ends with `Guard`. Example: `RolesGuard`.
- **Decorators**: the name is a function in `PascalCase`, because it is used as a decorator. Example: `CurrentUser`.

## Imports

- **Path aliases**: the aliases are defined in `tsconfig.json`. `@core/*` points to `./src/core/*`, `@features/*` points to `./src/features/*` and `@shared/*` points to `./src/shared/*`. Use the aliases for the imports between features and for the core and shared imports. Use relative paths in one feature.

## Inline comments

All the classes, the functions and the interfaces must have a JSDoc comment block. The conventions are:

- **Models**: one line that gives the purpose of the model in a short form.
- **Ports**: one line that gives the purpose of the port in a short form. Each method of the port must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Repositories**: one line that gives the purpose of the repository in a short form. Each method of the repository must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Use cases**: one line that gives the purpose of the use case in a short form. If the function accepts parameters, write them with `@param parameterName Purpose`. If the function returns data, write the data with `@returns Returned data`.
