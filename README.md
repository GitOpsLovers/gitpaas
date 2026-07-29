<div align="center">

# 🚀 GitPaaS

### Your apps. Your servers. Your platform.

**GitPaaS is an open, self-hostable PaaS** — install it on your own server and deploy applications straight from git, the way you would with Vercel, Dokploy, or Coolify. Except here, *you* own the infrastructure end to end.

<br />

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-v22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[![GHCR Images](https://img.shields.io/badge/images-ghcr.io-2088FF?logo=github&logoColor=white)](https://github.com/orgs/gitopslovers/packages)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)
[![Status](https://img.shields.io/badge/status-actively%20evolving-blueviolet)](./docs/deployment-roadmap.md)

</div>

---

## 🌟 What is GitPaaS?

Point GitPaaS at a git repository and it does the rest: it clones the repo at a specific commit, builds or pulls the images, and runs the resulting `docker-compose` stack on a Docker host you control — with a durable deployment queue and **live log streaming** to your browser.

There is no managed cloud in the middle. The platform and the apps it runs both live on *your* servers. You get the convenience of a modern PaaS with the control and privacy of self-hosting.

> 💡 **In one line:** GitPaaS is the control panel; your server is the runway.

---

## ✨ Features

|    | Feature                      | What it means for you                                                                                                             |
|----|------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| 🔀 | **Git-based deploys**        | Deploy any repo at a resolved commit — builds the `build:` services, pulls the rest, and brings the compose stack up.             |
| 📬 | **Durable deployment queue** | DB-backed, at-least-once queue with bounded retries, dead-lettering, and restart recovery. In-flight work survives a restart.     |
| 📡 | **Live log streaming**       | Deployment output streams to the browser over Server-Sent Events *and* is persisted, so history is replayable after the run ends. |
| 🔐 | **Single-server by design**  | GitPaaS and your apps run on the *same* machine; the engine drives the local Docker daemon through its unix socket — nothing to wire up.  |
| 🏠 | **Own your infrastructure**  | Self-hosted by design. Your code, your data, your servers — no third-party platform in between.                                   |
| 🐙 | **GitHub App integration**   | Browse repositories and branches, resolve commits, and pull archives through a GitHub App.                                        |
| 🛡️ | **Built-in authentication**  | JWT with refresh-token rotation and argon2 password hashing.                                                                      |
| 🩺 | **Operational tooling**      | Readiness probes for PostgreSQL, Redis, and Docker, plus image/volume/container pruning and read-only inspection.                 |

---

## 🧭 How it works

GitPaaS runs **entirely on one server** — yours.

- **🎛️ GitPaaS itself** — a NestJS API + deploy engine, an Angular web UI, plus its own **PostgreSQL** (durable state) and **Redis** (live log buffer + pub/sub). This is what you install and log into.
- **📦 Your apps** — deployed as compose stacks on that same server's **Docker daemon**, which the deploy engine drives through the mounted `/var/run/docker.sock` socket.

```mermaid
flowchart TD
    U["🧑‍💻 Operator / Users (browser)"] -->|HTTPS| CP

    subgraph SRV["🖥️ Your server"]
        subgraph CP["🎛️ GitPaaS"]
            FE["Angular UI"] --- BE["NestJS API + deploy engine"]
            BE --- PG[("PostgreSQL")]
            BE --- RD[("Redis")]
        end

        BE -->|"Docker Engine API over /var/run/docker.sock"| DK["Local Docker daemon"]
        DK --> APPS["Your deployed apps<br/>(compose stacks)"]
    end
```

A single deployment is one self-contained unit of work — *"bring this service's compose stack up on the server"* — orchestrated end to end by the control plane, streamed live, and recorded for replay.

> 🔑 **Worth knowing:** mounting `/var/run/docker.sock` into the backend gives it full control of the host's Docker daemon, which is equivalent to root on that server. Treat the GitPaaS instance — and everyone who can log into it — as trusted, and run it on a machine you are willing to dedicate to it.

📖 Dive deeper in the [Infrastructure Architecture](./docs/infrastructure-architecture.md).

---

## 🚀 Install

**Requirements:** a Linux server with root (or `sudo`) access and `curl`, `openssl` and `tar` available. Docker is installed for you if it's missing.

1. **Run the installer** on the server:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
   ```

2. **Enter your admin email** when prompted, and **copy the generated password** it prints — it is shown only once.

3. **Open the app** at the frontend URL the installer prints (`http://<your-server>:8080`) and log in with that email and password.

To install a specific release instead of the latest one, add `-s -- --version v1.0.0`. The installer is safe to re-run.

> ⚙️ **Before your first deploy**, edit `/opt/gitpaas/iac/production/.env` to add your GitHub App credentials, then re-apply with `sudo docker compose -f /opt/gitpaas/iac/production/docker-compose.yml up -d`. The installer prints the exact steps when it finishes.

🛠️ Setting up GitPaaS to work on it instead? See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📚 Documentation

| Doc                                                                     | What's inside                                                    |
|-------------------------------------------------------------------------|------------------------------------------------------------------|
| 🧩 [Backend Architecture](./docs/backend-architecture.md)               | The NestJS API's hexagonal layout, ports & adapters, persistence |
| 💼 [Backend Business](./docs/backend-business.md)                       | The domain workflows behind the deploy engine                    |
| 🎨 [Frontend Architecture](./docs/frontend-architecture.md)             | The Angular SPA's feature folders, layering, and conventions     |
| 🏗️ [Infrastructure Architecture](./docs/infrastructure-architecture.md) | The single-server model, dev vs. production, and image publishing |
| 🗺️ [Deployment Roadmap](./docs/deployment-roadmap.md)                   | The product vision and the phased path to a full PaaS            |

---

---

## 🤝 Contributing

Contributions are warmly welcome! 🎉 Whether it's a bug fix, a doc tweak, or a whole new feature, we'd love your help pushing GitPaaS toward the full PaaS vision.

📖 See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for setup and workflow.

---

## 📄 License

Released under the [MIT License](./LICENSE).

---

<div align="center">

Made with ❤️ by **GitOpsLovers**

</div>
