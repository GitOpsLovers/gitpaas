# service-runtime-logs

The tab "Logs" of a service shows eight hard-coded lines, so the operator cannot see the output of the container that runs. The logs that the backend holds today belong to a deployment, and they end when that deployment ends.

This feature reads the output of a container of the service, it streams that output to the browser in real time, and it keeps the lines under a retention of days. The operator picks the container in a dropdown menu, picks the number of the lines of the history, and downloads the output. The backend follows every container that runs; a container that stopped still gives its last lines.

Kubernetes stays out of scope, because the runtime of today is Docker alone.

## Phase 1 — The contract and the read of the output of a container

**Agent:** implementer
**Paths:** packages/contracts/src/logs/, apps/backend/src/core/

- [x] 1.1 Add the contract `RuntimeLogLine` in `packages/contracts/src/logs/`, with the timestamp, the source `stdout` or `stderr`, and the text. Do not change `LogEvent`.
- [x] 1.2 Add the method of the logs to the port `ContainerRuntime` in `core/domain/ports/container-runtime.port.ts`. It takes a tail, a flag of the follow and an option `since`.
- [x] 1.3 Implement that method in `DockerContainerRuntimeAdapter`, and reuse `docker-log.util.ts` for the frames.
- [x] 1.4 Write the unit tests of the adapter, for the tail and for the follow.

## Phase 2 — The store and the retention of the logs of the runtime

**Agent:** implementer
**Paths:** apps/backend/src/features/logs/

- [x] 2.1 Add a store of the logs of the runtime, keyed by the identifier of the container. Keep the port `LogStore` of the deployment as it is.
- [x] 2.2 Write the lines to PostgreSQL on a limit of the size or on a limit of the time, and never on a completion.
- [x] 2.3 Add a follower that opens one stream of the daemon for each container that runs, and that closes it when the container stops.
- [x] 2.4 Add the retention of X days to the job that cleans the logs, and give the value in the configuration.
- [x] 2.5 Write the unit tests of the store, of the follower and of the retention.

## Phase 3 — The endpoints of the logs of the runtime

**Agent:** implementer
**Paths:** apps/backend/src/features/logs/

- [ ] 3.1 Add `GET /api/v1/logs/runtime?containerId=&tail=&since=`, which returns the history.
- [ ] 3.2 Add `GET /api/v1/logs/runtime/stream?containerId=`, an endpoint of SSE that fans out the one stream of that container.
- [ ] 3.3 Apply the throttler `stream`, and refuse more than 5 connections of SSE for one user.
- [ ] 3.4 Return the error `503` when the daemon of Docker does not answer, as the feature of the containers does.
- [ ] 3.5 Write the unit tests of the controller and of the cases of use.

## Phase 4 — The tab Logs of the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/**/service-logs/

- [ ] 4.1 Add the repository of the API that reads the history and that opens the stream, and reuse the reader of SSE of `deployments-api.repository.ts`.
- [ ] 4.2 Replace the eight hard-coded lines with the data of that repository.
- [ ] 4.3 Add the dropdown menu of the containers of the service, and read the list from `GET /api/v1/containers?serviceId=`.
- [ ] 4.4 Add the selector of the number of the lines of the history.
- [ ] 4.5 Show the timestamp, and mark the line of `stderr`.
- [ ] 4.6 Add the button of the download of the output, as the modal of the deployment gives.
- [ ] 4.7 Write the unit tests of the component and of the repository.

## Phase 5 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 5.1 Write the behavior of the logs of the runtime into `docs/business/logs.md`, and delete the section "The tab Logs holds no true output".
- [ ] 5.2 Correct `docs/architecture/backend/key-flows.md` for the new store, the new follower and the two new endpoints.
- [ ] 5.3 Delete the folder `docs/roadmap/service-runtime-logs/`, and its line of `docs/roadmap.md`.
