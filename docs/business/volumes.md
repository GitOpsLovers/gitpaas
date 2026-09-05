# volumes

## Purpose

This capability keeps the data of a service, so a container writes files that survive its removal and its redeploy. GitPaaS creates the volume of its own record and the volume that the Compose file of the service declares under one table, and it marks the origin of each row. The tab "Volumes" of the detail of a service lists them, and it creates, renames, attaches and detaches one.

## The origin of a volume

The system SHALL mark each volume of a service with one of two origins:

1. **`gitpaas`.** A client of GitPaaS created the record of the volume.
2. **`compose`.** The Compose file of the service declares the volume, and no client of GitPaaS created its record; the adoption after a deployment recorded it.

Docker Compose alone creates the volume on the daemon, from the key it carries inside the Compose file of the user; GitPaaS creates no volume on the daemon, of either origin. The name a volume carries on the daemon is the key of the Compose file, with the prefix of the Compose project of the service, because Compose always prefixes the volume of a project with its name.

After a deployment, the system SHALL read the volumes of the Compose project on the daemon, and it SHALL record, with the origin `compose`, every key that the database does not hold yet. A volume that already exists, of either origin, keeps its data; the system never recreates it.

### Scenario: A deployment brings up a volume the database does not hold

- **WHEN** a deployment finishes, and the daemon holds a volume of the Compose project that no record of GitPaaS names
- **THEN** the system records that volume with the origin `compose`

### Scenario: A deployment brings up a volume the database already holds

- **WHEN** a deployment finishes, and the daemon holds a volume of a key the database already holds for the service
- **THEN** the system records no new volume, and the data of the existing volume stays

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

Each volume of the answer holds the identifier, the name, the name on the daemon, the origin, the state, the containers that hold it right now, and, when GitPaaS holds a mount for it, the compose service, the mount path and the mode of that mount. A volume in the state `orphan` carries no mount.

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

## Creation of a volume

The system SHALL create a volume of a service, and attach it to one service of its Compose file in the same call, at `POST /api/v1/services/:serviceId/volumes`.

The body holds the display name of the volume, the compose service it mounts into, the mount path and the mode. The system SHALL create the volume on the daemon, and it SHALL give it the state `pending`, because the mount reaches the container at the next deployment.

### Scenario: The creation succeeds

- **WHEN** a client posts a name that no other volume of the service carries, and a mount path that no other volume of the service holds
- **THEN** the system creates the volume on the daemon, writes the record and its mount, and answers `201` with the volume in the state `pending`

### Scenario: The name is already in use in the service

- **WHEN** a client posts a name that another volume of the service already carries
- **THEN** the system raises `VOLUME_NAME_TAKEN`, and it answers `409 Conflict`

### Scenario: The mount path is already in use in the service

- **WHEN** a client posts a mount path that another volume of the service already holds
- **THEN** the system raises `VOLUME_MOUNT_PATH_TAKEN`, and it answers `409 Conflict`

## The rule of the mount path

The system SHALL keep one mount path for one volume alone inside a service. The mount path starts with the slash, it holds no space and no empty segment, it does not end with the slash, and it names no path of the system, such as `/etc` or `/usr`.

### Scenario: A second volume asks for the same mount path

- **WHEN** a client attaches or creates a volume with a mount path that another volume of the same service already holds
- **THEN** the system raises `VOLUME_MOUNT_PATH_TAKEN`, and it answers `409 Conflict`

### Scenario: The mount path names a path of the system

- **WHEN** a client attaches or creates a volume with a mount path such as `/etc` or `/usr`
- **THEN** the system answers `400 Bad Request`

## Rename of a volume

The system SHALL rename a volume of a service at `PUT /api/v1/services/:serviceId/volumes/:id`, without any change on the daemon.

### Scenario: The rename succeeds

- **WHEN** a client renames a volume of a service with a name that no other volume of that service carries
- **THEN** the system writes the new name, and it answers `200` with the renamed volume

### Scenario: The name is already in use in the service

- **WHEN** a client renames a volume with a name that another volume of the same service already carries
- **THEN** the system raises `VOLUME_NAME_TAKEN`, and it answers `409 Conflict`

## Attach of a volume

The system SHALL attach a volume of a service to one service of its Compose file at `PUT /api/v1/services/:serviceId/volumes/:id/mount`, and it SHALL answer `204 No Content`.

The mount reaches the container only at the next deployment of the service, because Docker fixes the mounts of a container at its creation, and it never changes them while the container runs.

### Scenario: The attach succeeds

- **WHEN** a client attaches an available volume of a service to a compose service, with a mount path that no other volume of the service holds
- **THEN** the system writes the mount, and it answers `204`

### Scenario: The volume does not exist in the service

- **WHEN** a client attaches a volume with an identifier that the service does not hold
- **THEN** the system raises `VOLUME_NOT_FOUND`, and it answers `404 Not Found`

## Detach of a volume

The system SHALL detach a volume from the service of the Compose file that mounts it, at `DELETE /api/v1/services/:serviceId/volumes/:id/mount`, and it SHALL answer `204 No Content`.

The container of the service still holds the volume until the next deployment removes the mount from the Compose file. The volume record itself stays; this operation removes the mount alone, and it removes no volume.

### Scenario: The detach succeeds

- **WHEN** a client detaches an available volume that a service holds a mount for
- **THEN** the system removes the mount, and it answers `204`

### Scenario: The volume holds no mount

- **WHEN** a client detaches a volume that the service holds no mount for
- **THEN** the system raises `VOLUME_NOT_ATTACHED`, and it answers `404 Not Found`

## The removal of a service removes every volume it holds

The removal of a service SHALL remove, on the daemon, every volume that carries the label of the service, whatever its origin. GitPaaS stamps that label on every volume its recipe declares, of the origin `gitpaas` and of the origin `compose` alike, so the removal reaches every volume of the service, and none of a sibling service. See the requirement *Removal of a service* of the capability [services](./services.md) for the order of the cleanup of the server.

### Scenario: The service holds a volume of GitPaaS

- **WHEN** a client removes a service that holds a volume of the origin `gitpaas`
- **THEN** the system removes that volume on the daemon

### Scenario: The service holds a volume the Compose file declares

- **WHEN** a client removes a service that holds a volume of the origin `compose`
- **THEN** the system removes that volume on the daemon as well

## The tab "Volumes" of a service

The tab `volumes` SHALL show the volumes of the service, and it SHALL let the user create a volume, rename a volume, attach a volume to one service of the Compose file, and detach a volume. It offers no action that removes a volume alone; a volume goes away only with the service that owns it. See the requirement *The nine tabs of the screen* of the capability [services](./services.md) for the place of this tab among the others.

The tab warns that an attach and a detach take effect at the next deployment of the service, because Docker fixes the mounts of a container at its creation.

### Scenario: The user opens the tab of the volumes

- **WHEN** the user opens the tab `volumes`
- **THEN** the system shows the volumes of the service, or the state of the reading

### Scenario: A write waits for the next deployment

- **WHEN** the user attaches or detaches a volume
- **THEN** the system shows that the change reaches the container at the next deployment
