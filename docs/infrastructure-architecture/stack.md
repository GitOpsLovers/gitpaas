# Stack

| Concern             | Tool                                                   |
|---------------------|--------------------------------------------------------|
| Orchestration       | Docker Compose (`iac/development/`, `iac/production/`) |
| Images              | Multi-stage Dockerfiles                                |
| Database            | `postgres:17.6-alpine`                                 |
| Live log store      | `redis:8.2-alpine` with AOF persistence                |
| Workload execution  | Local Docker daemon via `/var/run/docker.sock`         |
| Static serving      | nginx-unprivileged                                     |
| Release             | GitHub Actions + semantic-release, images on GHCR      |
