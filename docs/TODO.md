- [] Add a root `turborepo.json` file.
- [] Decide if we control the secrets with Docker secrets.
- [] https://shiptypes.com/

## Structural

- [] Add a scheduled cleanup job that archives and frees the Redis log streams that an interrupted deployment leaves behind (an archive that fails, or a crash between the last append and the completion). The start-up drain that did this was removed, and nothing recovers these keys now. `@nestjs/schedule` is already in `package.json`.