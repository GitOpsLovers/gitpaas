# Deployment workflow

The work takes a long time. Thus it is divided into a **quick synchronous request** that records the intention, and a **background run** that does the work. Three features operate together: `deployments` (the trigger, the record, the lifecycle and the execution), `providers` (GitHub: it finds the commits and downloads the source), and `logs` (it keeps and streams the output).

**1. Trigger.** Send `POST /api/v1/deployments` with only a `serviceId`. The server calculates all the other data. The request means "deploy the current head of the branch of this service, now".

**2. Validate and prepare** (the create-deployment use case, before the record is written):

- The service must be available. If not, the use case gives a `ServiceNotFoundError`.
- The service must be deployable (it must have a repository and a deployment branch). If not, the use case gives a `ServiceNotDeployableError`.
- Find the head commit of the branch with the provider client. Thus the deployment points to an exact SHA (and to the first line of the message).

Then write a deployment record with the status `pending`, which holds the selected commit, the branch, the compose path and the trigger.

**3. Immediate response.** The record comes back immediately, before any Docker work. The **`id`** is the most important part of the record. A wait of some minutes can cause a timeout in the client or in a proxy, and it gives no data about the progress. Thus the client uses that id to subscribe to the live log stream.

**4. Background run.** The use case puts a run task in the `DeploymentQueue`. The queue is **durable**: each task is a row in a queue table and is not only in the memory. Thus the work that is not complete stays after a restart of the process. A runner in the same feature takes the tasks and runs each one:

1. Set the status to `running`.
2. Get the repository archive at the selected commit (a gzipped tarball) from the provider client.
3. Run the Docker executor: extract the archive, build the local `build:` services, pull the registry images, stop the previous stack, and start the new stack. The executor emits one line of output for each step.
4. Set the status to `success` or to `failed`.

The lifecycle has four states: `pending → running → success | failed`.

**Order, new attempts and recovery.** The runs for the **same compose project** occur one after the other. Thus a new deployment never occurs at the same time as the removal of the previous stack. But different projects deploy at the same time. If a run has an unexpected failure, the queue **tries it again** to a maximum of three attempts. When there are no more attempts, the task goes to the **dead-letter** state and its deployment gets the status `failed`. Thus nothing stays in the `pending` state. At startup, the runner **recovers** the tasks that are not complete, which a restart stopped during the run, and runs them again. A business failure, such as a build error or a daemon that is not available, becomes a `failed` deployment with its logs and is not tried again.

**5. Logs.** The runner does not keep the output itself. It sends each executor line to the **write port** of the logs (`append`) and calls `complete(status)` at the end. Behind the port, `logs` keeps **two** tiers: Redis is the hot store, which holds the output of a deployment that runs, and the `logs` table is the cold archive, which receives the full output one time:
- Each line goes immediately to the hot store of that deployment, and every reader of that deployment reads the same recorded output. The order comes from the store itself, and no line gets a number when it is written.
- At `complete`, the store writes the terminal `end` entry, and then it copies the full output to the `logs` table. Thus a subscriber that connects at that moment finds the entry, and its stream closes and does not stay in the "running" state. The hot copy stays for a short grace period after the archive, so a slow reader can read the last lines.

**6. Read the output.** Use the id from step 3:

- Live: `GET /api/v1/logs/:deploymentId/stream` (SSE). It gives the recorded output of the deployment from the start, then it continues with the live output on the **same** cursor, then it sends the terminal `end` event and closes. Because one cursor gives the two parts, there is no change-over between a replay and a live channel, and thus there is no deduplication. Thus a client that connects during the run also sees the output from the start, and a client that connects **after** the end of the run reads the archive and gets a correct close. If the log cannot be read (for example, the hot store is not available), the stream does not break the connection: it sends one `error` event with a code and a safe message, and then it closes. Thus the client always knows why the output stopped. As for the other parts of the API, the stream needs an access token. Thus the client must use an SSE reader that can send a token, because a plain `EventSource` cannot send an authentication header.
- Durable: `GET /api/v1/logs?deploymentId=…`. It reads the archived rows as a flat list in the correct order.

> **`GET /logs` gives no history while a deployment runs.** The archive is written one time, at the completion of the run. Thus this endpoint gives an empty list until the deployment ends. To see the output of a deployment that runs, use the SSE route, which has no change.

These two endpoints are all the HTTP surface of the feature. `logs` has no CRUD endpoints, because only the runner writes log entries, and it writes them through the port.
