# Server maintenance

The `server` feature removes the unused images, volumes and stopped containers from the server. It also removes the orphan GitPaaS containers whose compose project agrees with no available service. It gives a public **readiness probe** (`GET /api/v1/server/readiness`), which examines the critical dependencies: PostgreSQL and the Docker daemon.
