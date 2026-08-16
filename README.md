<div align="center">

# 🚀 GitPaaS

### Your apps. Your servers. Your platform.

**GitPaaS is an open, self-hostable PaaS.** Install it on your own server and deploy applications straight from multiple source providers.

<br />

[![NestJS](https://img.shields.io/badge/NestJS-v11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Angular](https://img.shields.io/badge/Angular-v22-DD0031?logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

[![GHCR Images](https://img.shields.io/badge/images-ghcr.io-2088FF?logo=github&logoColor=white)](https://github.com/orgs/gitopslovers/packages)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

</div>

---

## 🌟 What it is

Point GitPaaS at a Git repository and press **Deploy**. It resolves the branch to a commit, downloads the source, and brings the repository's Docker Compose stack up on your server — streaming the output to your browser as it goes.

No managed cloud sits in the middle. GitPaaS and the apps it runs share one machine, which is yours.

- 🔀 Deploy any repository your source provider can reach, at any branch
- 📡 Live log streaming, archived afterwards so you can read it again
- 📬 A deployment queue that survives a restart
- 🔐 Provider credentials encrypted at rest, and never returned by the API
- 🩺 Readiness probes, image pruning and container cleanup

---

## 🚀 Install

You need a Linux server with `sudo`, plus `curl`, `openssl` and `tar`. Docker is installed for you if it is missing.

```bash
curl -fsSL https://raw.githubusercontent.com/GitOpsLovers/gitpaas/main/scripts/install.sh | sh
```

Enter your admin email, **copy the password it prints**, then open `http://<your-server>:8080` and sign in.

Add `-s -- --version v1.0.0` to pin a release. The installer is safe to re-run.

> 🔑 The backend mounts `/var/run/docker.sock`, which is equivalent to root on that machine. Give GitPaaS a server you are willing to dedicate to it, and trust its users accordingly.

---

## 🧭 First deployment

1. **Providers** — connect your source control. GitHub is available today, and the port is ready for more.
2. **Namespace → Project → Service** — a service names one repository, one branch and one compose file.
3. **Deploy** — press the button and watch the log stream.

Each repository needs its own `docker-compose.yml`. GitPaaS runs that file; it does not generate one for you.

---

## 📚 Documentation

| Doc | What's inside |
|---|---|
| 🧩 [Backend Architecture](./docs/backend-architecture.md) | The NestJS API's hexagonal layout, ports and adapters, persistence |
| 💼 [Backend Business](./docs/backend-business.md) | The domain workflows behind the deploy engine |
| 🎨 [Frontend Architecture](./docs/frontend-architecture.md) | The Angular SPA's feature folders, layering and conventions |
| 🏗️ [Infrastructure Architecture](./docs/infrastructure-architecture.md) | The single-server model, dev vs. production, image publishing |

Behaviour is specified in [`openspec/specs/`](./openspec/specs/) and planned work in [`openspec/changes/`](./openspec/changes/), following the [OpenSpec](https://openspec.dev/) standard. The `docs/` pages explain how the system is built; the specifications state what it must do.

---

## 🤝 Contributing

Contributions are warmly welcome! 🎉 A new provider adapter is a great place to start. See **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## 📄 License

Released under the [MIT License](./LICENSE).

---

<div align="center">

Made with ❤️ by **GitOpsLovers**

</div>
