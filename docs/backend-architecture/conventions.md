# Conventions

## Ports and dependency injection

The repositories and the other collaborators obey the **port and adapter** pattern:

- **Port**: a plain `interface` (for example, `ProjectsRepository`). Its methods are arrow-function properties written in domain terms: they accept and return domain models and DTOs, and never ORM types or vendor types. A use case depends only on this interface.
- **Adapter**: an `@Injectable()` class that has `implements` for the port (for example, `DatabaseProjectsRepository`) of a `repositories/` interface
- **Wiring**: the module puts the **concrete class** in its `providers`. The consumer injects the dependency **by class** (`@Inject(ProjectsDatabaseRepository)`, with `import type` for the port) and gives it the type of the **port**.

## Transformers

An infrastructure repository must not return a raw ORM entity or a vendor shape. The mapping stays in an adjacent `*.transformer.ts` file. The file exports plain functions that change a persistence shape or a vendor shape into a domain model, for example `to<Model>(...)`. A different function in the same file does the opposite operation. The repositories call these functions where necessary (`rows.map(toProject)`). This rule applies to all the types of infrastructure.

## Persistence

- The TypeORM connection is configured one time in `CoreModule` with `forRootAsync`. The features call only `forFeature`. Thus there is no central list of the entities.
- The entities have the `@Entity('<plural_snake_case>')` decorator. They use UUID primary keys (`@PrimaryGeneratedColumn('uuid')`), which the domain model shows as `id: string`.
- `synchronize` is enabled only in the development environment. In production, the infrastructure migration system is used.
- Almost all the infrastructure entities have a related model in the domain layer. Each entity shows the business model as it is written into a persistence system.

## Validation

A write endpoint validates its input with DTO classes. The global `ValidationPipe` applies this validation. The DTOs stay in `domain/dtos/`. They are the only domain files that can import a framework and can use the `!` assertion, and they connect to the requests with `@Body()`. The pipe rejects unknown properties. Thus the DTO is the authoritative input contract. Nested payloads are validated with `@ValidateNested({ each: true })` and `@Type(() => Dto)`. Optional fields have the `@IsOptional()` decorator.

## HTTP and REST

The global route prefix is `api/v1`. The listen port comes from `getOrThrow('PORT')` and has no default value in the code. CORS uses credentials and permits only the allowlist that is read from the necessary `CORS_ORIGIN` variable. A controller declares only the path of its resource (`@Controller('projects')`).

| Method & path | Notes                                               |
|---------------|-----------------------------------------------------|
| `GET /`       | list (optionally filtered via cleaned query params) |
| `GET /:id`    | 404 when missing                                    |
| `POST /`      | `@Body()` create DTO                                |
| `PUT /:id`    | `@Body()` update DTO; 404 when missing              |
| `DELETE /:id` | `@HttpCode(204)`; 404 when missing                  |

The `:id` segment connects with `@Param('id', ParseUUIDPipe)`. **The not-found condition is an HTTP concern**: a repository returns `null` and `delete()` returns a `boolean`, and the controller raises `NotFoundException`. The domain never throws an HTTP exception. The domain raises a domain error, and the UI edge changes it.

## File naming

All the backend files must obey a naming convention. The conventions are as follows:

### Domain

- **Models**: `<name>.models.ts`, where `name` is always in kebab-case. Example: `user.models.ts`.
- **Ports**: `<name>.port.ts`, where `name` is always in kebab-case. Example: `container-runtime.port.ts`.
- **Repositories**: `<name>.repository.ts`, where `name` is always in kebab-case. Example: `users.repository.ts`.

### Application

- **Use cases**: `<name>.use-case.ts`, where `name` gives the purpose of the use case. Example: `get-containers-by-service.use-case.ts`.

### Infrastructure

- **Adapters**: `<technology>-<name>.adapter.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the port uses. Example: `docker-container-runtime.adapter.ts`.
- **Repository implementations**: `<technology>-<name>.repository.ts`, where `<name>` and `<technology>` are always in kebab case, and `<technology>` is the type of integration that the repository uses. Example: `db-users.repository.ts`.
- **Database entities**: `<db>-<name>.entity.ts`, where `<name>` is always lowercase. Example: `db-project.entity.ts`.

## Class and function naming

### Domain

- **Ports**: the name is in `PascalCase`. Example: `ContainerRuntime`.
- **Repositories**: the name is in `PascalCase`. It is the name of the entity plus `Repository`. Example: `UsersRepository`.

### Application

- **Use cases**: the name is in `camelCase`. It gives the purpose of the use case and ends with `UseCase`. Example: `createProjectUseCase`.

### Infrastructure

- **Adapters**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Adapter`. Example: `DockerContainerRuntimeAdapter`.
- **Repository implementations**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Repository`. Example: `DatabaseUsersRepository`.
- **Database entities**: the name is in `PascalCase`. It always starts with `Db`, then it gives the name of the entity, and it ends with `Entity`. Example: `DbProjectEntity`.

## Imports

- **Path aliases**: the aliases are defined in `tsconfig.json`. `@core/*` points to `./src/core/*`, `@features/*` points to `./src/features/*` and `@shared/*` points to `./src/shared/*`. Use the aliases for the imports between features and for the core and shared imports. Use relative paths in one feature.

## Inline comments

All the classes, the functions and the interfaces must have a JSDoc comment block. The conventions are:

- **Models**: one line that gives the purpose of the model in a short form.
- **Ports**: one line that gives the purpose of the port in a short form. Each method of the port must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
- **Repositories**: one line that gives the purpose of the repository in a short form. Each method of the repository must have its own JSDoc block with one line that gives the purpose of the method. If the method accepts parameters, write them with `@param parameterName Purpose`. If the method returns data, write the data with `@returns Returned data`.
