# Contributing

## Prerequisites

- Node `26.1.0` and pnpm (see `.tool-versions`)
- Docker running on your host

## Setup

```bash
pnpm install
```

## Local development stack

In production the Artifactory deploys applications by talking to a remote VPS's Docker daemon via [Dockerode](https://github.com/apocas/dockerode). Locally we reproduce that VPS with a Docker-in-Docker (DinD) container defined in `iac/development/docker-compose.yml`. Artifactory connects to it over TLS, exactly as it would to a real VPS.

```
Host Docker
└── artifactory-vps                               ← docker:29-dind, the emulated "VPS"
     └── its own dockerd (TLS on 127.0.0.1:2376)
          └── deployed apps                       ← everything the Artifactory deploys lives here
```

Manage it with Docker Compose from `iac/development/`:

```bash
cd iac/development

docker compose up -d --wait                             # start and wait until the daemon is healthy
docker compose down                                     # stop (keeps deployed images/volumes)
docker compose logs -f vps                              # follow logs
docker compose down -v && rm -rf ../../.dev/vps-certs   # wipe all state
```

On first `docker compose up` the container generates TLS certificates and shares the client certs with the host under `.dev/vps-certs/client/`; the Backend reads them from there.

**Ports:** `2376` → TLS Docker daemon (Dockerode target); `8080`→`80` and `8443`→`443` are reserved for a future reverse proxy for deployed apps.

## Running the apps

```bash
docker compose -f iac/development/docker-compose.yml up -d --wait   # start the emulated VPS
pnpm dev                                                            # run all apps, or: pnpm --filter backend dev
```

The Backend builds its Dockerode client from `VPS_DOCKER_HOST` (default `127.0.0.1`), `VPS_DOCKER_PORT` (default `2376`) and `VPS_DOCKER_CERT_PATH` (default `../../.dev/vps-certs/client`). Verify connectivity:

```bash
curl http://localhost:3000/vps/status
# { "connected": true, "serverVersion": "29.6.1", ... }
```