# Class and function naming of the backend

## Domain

- **Ports**: the name is in `PascalCase`. Example: `ContainerRuntime`.
- **Repositories**: the name is in `PascalCase`. It is the name of the entity plus `Repository`. Example: `UsersRepository`.
- **DTOs**: the name is in `PascalCase`. It is the verb, plus the name of the entity, plus `Dto`. Example: `CreateProjectDto`.
- **Errors**: the name is in `PascalCase`. It gives the condition and ends with `Error`. Example: `ProjectNotFoundError`.

## Application

- **Use cases**: the name is in `camelCase`. It gives the purpose of the use case and ends with `UseCase`. Example: `createProjectUseCase`.

## Infrastructure

- **Adapters**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Adapter`. Example: `DockerContainerRuntimeAdapter`.
- **Repository implementations**: the name is in `PascalCase`. It is the name of the technology, plus the name of the entity, plus `Repository`. Example: `DatabaseUsersRepository`.
- **Database entities**: the name is in `PascalCase`. It always starts with `Db`, then it gives the name of the entity, and it ends with `Entity`. Example: `DbProjectEntity`.
- **Transformers**: the file exports plain functions, not a class. Each function is in `camelCase` and starts with `to`, followed by the name of the shape it builds. Example: `toProject`.

## UI

- **Controllers**: the name is in `PascalCase`. It is the name of the resource plus `Controller`. Example: `ProjectsController`.
- **Services**: the name is in `PascalCase`. It is the name of the feature plus `Service`. Example: `ProjectsService`.
- **Guards**: the name is in `PascalCase`. It gives the check and ends with `Guard`. Example: `RolesGuard`.
- **Decorators**: the name is a function in `PascalCase`, because it is used as a decorator. Example: `CurrentUser`.
