# The reverse proxy of the local environment

The proxy exists in the production stack alone, so a developer cannot test the routing of the domains. The stack of `iac/development/` holds no proxy and no network `gitpaas-proxy`, so every deployment writes the line `✖ Could not attach` and nothing routes. We add Traefik to the local stack, its network, its dashboard and a probe, and we make the store of ACME a documented variable. The local environment answers on HTTP alone, and it uses the names of `*.localhost`. Out of scope: a certificate of a local authority, the staging service of Let's Encrypt for a local name, a service of DNS, and every change of the production runtime except the mount that the store of ACME needs.

## Phase 1 — The proxy of the local stack

**Agent:** implementer
**Paths:** iac/development/docker-compose.yml, docs/architecture/infrastructure/

- [x] 1.1 Add the network `gitpaas-proxy` to `iac/development/docker-compose.yml`, with the name that `PROXY_NETWORK` of `traefik-reverse-proxy.constants.ts` holds.
- [x] 1.2 Add the service `proxy` with the image of Traefik, the entry point `web` on the port `80`, and read access to the socket of the Docker daemon.
- [x] 1.3 Declare no resolver of ACME in the local proxy, because a local name takes HTTP alone.
- [x] 1.4 Turn on the dashboard, and route it to the host `traefik.localhost` through the proxy itself.
- [x] 1.5 Add the service `whoami` behind the host `whoami.localhost`, so a developer proves the routing without a deployment.
- [x] 1.6 Make the proxy start with the stack, without a profile, so `docker compose up -d` gives it.
- [x] 1.7 Check that the ports of the local stack do not collide, and report the collision if one exists.

## Phase 2 — The store of ACME and its variable

**Agent:** implementer
**Paths:** apps/backend/, iac/production/docker-compose.yml, iac/production/.env.example, scripts/install.sh

- [x] 2.1 Add `PROXY_ACME_PATH` to `apps/backend/.env.example`, with the value that the local environment takes and a comment of one line.
- [x] 2.2 Add `PROXY_ACME_PATH` to `iac/production/.env.example`, and give the container `backend` of `iac/production/docker-compose.yml` a read-only mount of the volume `proxy-acme`.
- [x] 2.3 Make `getCertificateStates` of `traefik-reverse-proxy.adapter.ts` read no store when no host takes HTTPS, so the local log carries no warning.
- [x] 2.4 Make the adapter log the absent store one time, and not at each refresh.
- [x] 2.5 Update the specs of the adapter: the store is absent, no host takes HTTPS, and the store holds a certificate.
- [x] 2.6 Run `rtk pnpm run check-types --filter @gitpaas/backend`.

## Phase 3 — The documentation

**Agent:** documenter
**Paths:** docs/business/, docs/architecture/infrastructure/, README.md
**This is the last phase.**

- [ ] 3.1 Correct `docs/architecture/infrastructure/structure.md`, which says that no proxy runs in the development.
- [ ] 3.2 Add the proxy, the dashboard, the probe and the network to the pages of the local stack of `docs/architecture/infrastructure/`.
- [ ] 3.3 Write the procedure that tests a domain on the local machine: the name of `*.localhost`, the deployment, and the check.
- [ ] 3.4 Add `PROXY_ACME_PATH` to the page of the variables of the environment.
- [ ] 3.5 Correct `docs/business/domains.md` for the behavior of the local environment, which gives HTTP alone.
- [ ] 3.6 Delete `docs/roadmap/local-reverse-proxy/`, and remove its line from `docs/roadmap.md`.
