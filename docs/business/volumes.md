# volumes

## Purpose

This capability keeps the data of a service, so a container writes files that survive its removal and its redeploy. The Compose file of a service is the one source of truth of its volumes: a service declares a named volume with an entry of the block `volumes`, and it mounts that volume into one of its compose services. The tab "Volumes" of the detail of a service is a read-only view of what its Compose file declares, and of the state each volume holds on the daemon; it creates no volume, and it renames, attaches or detaches none.

Docker Compose alone creates the volume on the daemon, from the key it carries inside the Compose file of the user; GitPaaS creates no volume on the daemon. The name a volume carries on the daemon is the key of the Compose file, with the prefix of the Compose project of the service, because Compose always prefixes the volume of a project with its name.

## The reconciliation of the volumes of a service

The system SHALL bring the record of the volumes of a service to the named volumes its Compose file declares, after every deployment that reads a Compose file: it SHALL record a named volume the Compose file adds, it SHALL update the mount of a named volume whose compose service, mount path or mode changed, and it SHALL delete the record of a named volume the Compose file no longer declares. The Compose file stays the one source of truth; the record never gains a volume of its own accord, and it never keeps one the Compose file dropped.

A failure of the reconciliation SHALL NOT fail the deployment. The reconciliation reads the same Compose text the deployment already read, after the daemon brought the stack up, and the record of the volumes keeps the state of the last reconciliation that succeeded.

### Scenario: A deployment adds a named volume

- **WHEN** a deployment reads a Compose file that declares a named volume the database does not hold yet
- **THEN** the system records that volume, with the mount its Compose file declares

### Scenario: A deployment changes the mount of a named volume

- **WHEN** a deployment reads a Compose file where a named volume already recorded takes a different compose service, mount path or mode than the record holds
- **THEN** the system updates the mount of that record

### Scenario: A deployment removes a named volume from the Compose file

- **WHEN** a deployment reads a Compose file that no longer declares a named volume the database holds
- **THEN** the system deletes the record of that volume, and its mount goes with it

### Scenario: The reconciliation fails

- **WHEN** the reconciliation of the volumes of a deployment fails
- **THEN** the deployment still completes, and the record of the volumes keeps the state of the last reconciliation that succeeded

## The bind mount of a Compose file

The system SHALL mount a folder of the repository into a container when the Compose file of the service declares a bind mount, and it SHALL keep the record of the volumes untouched for that entry.

An entry of the block `volumes` of a Compose service declares a bind mount when its source holds a slash, and a named volume otherwise. The system SHALL make a relative source absolute against the folder of the Compose file, inside the extracted repository, so `./config:/etc/app` reaches the container with the files of the repository at the commit of the deployment. The system SHALL keep every option of the entry, such as `:ro`, and it SHALL read the short form `source:target` and the long form with the key `type` alike. A source that already starts with the slash names a path of the host, and the system SHALL pass it unchanged.

A bind mount carries no record of the capability, because it holds no data of its own: the folder of the repository is its content, and the next deployment brings that folder again. A named volume keeps the record, the state and the tab of this page.

### Scenario: The Compose file declares a relative source

- **WHEN** a Compose service declares the volume `./config:/etc/app:ro`
- **THEN** the deployment mounts the folder `config` beside the Compose file of the repository, read-only

### Scenario: The Compose file declares the long form

- **WHEN** a Compose service declares a volume with the key `type` set to `bind` and a relative source
- **THEN** the deployment resolves that source in the same way as the short form

### Scenario: The Compose file declares a named volume

- **WHEN** a Compose service declares the volume `data:/var/lib/app`, and the source holds no slash
- **THEN** the deployment leaves the entry unchanged, and the volume follows the requirement *The reconciliation of the volumes of a service*

## The source of the home folder is not supported

The system SHALL fail the deployment when the source of a bind mount starts with `~`, and the message SHALL name the compose service and the entry.

The daemon resolves `~` against the home folder of the host, and never against the extracted repository, so the container would receive a folder that the repository never declares — or an empty folder that the daemon creates. The system therefore refuses the entry instead of mounting something else than the author asked for. The message asks for a path relative to the Compose file, an absolute path of the host, or a named volume.

### Scenario: A Compose service declares a source of the home folder

- **WHEN** a Compose service declares the volume `~/data:/var/lib/app`
- **THEN** the deployment fails with a message that names that service and that entry

## The five states of a volume

The system SHALL give each volume of a service one of five states:

1. **`mounted`.** A container of the service holds the volume right now.
2. **`pending`.** GitPaaS holds a mount for the volume, the daemon holds the volume, and no container holds it yet. The next deployment mounts it.
3. **`missing`.** GitPaaS holds a mount for the volume, and the daemon does not hold the volume, for example because an operator removed it outside GitPaaS. The next deployment creates it again.
4. **`declared`.** The daemon holds the volume, and GitPaaS holds no mount for it.
5. **`orphan`.** The daemon holds the volume, and no record of GitPaaS names it.

A container that holds the volume gives it the state `mounted` before any other check. A volume the daemon does not hold, and that no container holds, gives `missing`. A volume the daemon holds, that no container holds, gives `pending` when GitPaaS holds a mount for it, and `declared` otherwise.

### Scenario: A container mounts the volume

- **WHEN** a container of the service holds the volume
- **THEN** the system gives the volume the state `mounted`

### Scenario: The volume waits for the next deployment

- **WHEN** GitPaaS holds a mount for the volume, the daemon holds the volume, and no container holds it
- **THEN** the system gives the volume the state `pending`

### Scenario: The volume disappeared from the daemon

- **WHEN** GitPaaS holds a mount for the volume, and the daemon does not hold it
- **THEN** the system gives the volume the state `missing`

### Scenario: The Compose file declares the volume alone

- **WHEN** the daemon holds the volume, and GitPaaS holds no mount for it
- **THEN** the system gives the volume the state `declared`

### Scenario: The daemon holds a volume that no record claims

- **WHEN** the daemon holds a volume under the Compose project of the service, and no record of GitPaaS names it
- **THEN** the system gives the volume the state `orphan`

## Read of the volumes of a service

The system SHALL answer with the volumes of one service at `GET /api/v1/services/:serviceId/volumes`.

Each volume of the answer holds the identifier, the name, the name on the daemon, the state, the containers that hold it right now, and, when GitPaaS holds a mount for it, the compose service, the mount path and the mode of that mount. A volume in the state `orphan` carries no mount.

The system SHALL answer `503 Service Unavailable` only when the read fails because the daemon is not reachable. A read that fails for another reason, such as a failure of the database, SHALL answer `500 Internal Server Error` with the code `SERVER_ERROR`, so a `503` states an outage of the server alone and never hides a fault of the platform.

### Scenario: The service holds volumes

- **WHEN** a client calls the endpoint with the identifier of an available service
- **THEN** the system answers `200` with the volumes GitPaaS holds for that service, and the volumes of the daemon that no record claims

### Scenario: The daemon is not reachable

- **WHEN** the read of the volumes of a service fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with a message that asks the operator to verify that the server runs and that it is reachable

### Scenario: The read fails for another reason

- **WHEN** the read of the volumes of a service fails for a reason other than a daemon that is not reachable
- **THEN** the system answers `500 Internal Server Error` with the code `SERVER_ERROR`

## The removal of a service removes every volume it holds

The removal of a service SHALL remove, on the daemon, every volume that carries the label of the service. GitPaaS stamps that label on every volume its recipe declares, so the removal reaches every volume of the service, and none of a sibling service. See the requirement *Removal of a service* of the capability [services](./services.md) for the order of the cleanup of the server.

### Scenario: The service holds a named volume

- **WHEN** a client removes a service that holds a named volume its Compose file declares
- **THEN** the system removes that volume on the daemon

## The tab "Volumes" of a service

The tab `volumes` SHALL show the volumes of the service, as a read-only view: the name, the state, and, when the Compose file mounts it, the compose service, the mount path and the mode of that mount, and the containers that hold each volume right now. It offers no action that creates, renames, attaches or detaches a volume; the Compose file of the service is the one place that changes a volume. See the requirement *The nine tabs of the screen* of the capability [services](./services.md) for the place of this tab among the others.

### Scenario: The user opens the tab of the volumes

- **WHEN** the user opens the tab `volumes`
- **THEN** the system shows the volumes of the service, or the state of the reading

### Scenario: A change of the Compose file reaches the tab

- **WHEN** a deployment of the service reconciles a named volume its Compose file changed
- **THEN** the tab shows that change after the deployment completes
