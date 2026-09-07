# docker

## Purpose

This capability shows the operator the real state of the Docker daemon of the server, in four tables: the containers, the images, the volumes and the networks of the whole host. Unlike the other capabilities that read Docker, this one applies no label filter and no scope of a project or of a service; it shows every resource the daemon holds, including the ones that a third-party stack made. It only reads, and it changes nothing: no start, no stop, no prune and no delete.

## List of the containers of the host

The system SHALL answer with every container of the Docker host at `GET /api/v1/docker/containers`, for an authenticated client, the stopped ones included.

Each container of the answer holds the identifier, the names, the image, the state, the status, the date of the creation, the published ports, the networks it joined and the filesystems it mounts. Each port holds the private port, the public port and the kind of the protocol; the public port holds `null` when the container publishes no port to the host. Each mount holds its name, its type, its source, its destination and whether it is read-only; the name holds `null` for a bind mount, which carries none.

### Scenario: The host runs containers

- **WHEN** an authenticated client calls the endpoint
- **THEN** the system answers `200` with every container of the host, the stopped ones included

### Scenario: The host runs no container

- **WHEN** an authenticated client calls the endpoint, and the host runs no container
- **THEN** the system answers `200` with an empty list

## List of the images of the host

The system SHALL answer with every image of the Docker host at `GET /api/v1/docker/images`, for an authenticated client.

Each image of the answer holds the identifier, the tags, the size in bytes and the date of the creation.

### Scenario: The host holds images

- **WHEN** an authenticated client calls the endpoint
- **THEN** the system answers `200` with every image of the host

## List of the volumes of the host

The system SHALL answer with every volume of the Docker host at `GET /api/v1/docker/volumes`, for an authenticated client.

Each volume of the answer holds the name, the driver, the mount point, the scope, the labels and the date of the creation. The date holds `null` when the daemon reports none for that volume.

### Scenario: The host holds volumes

- **WHEN** an authenticated client calls the endpoint
- **THEN** the system answers `200` with every volume of the host

## List of the networks of the host

The system SHALL answer with every network of the Docker host at `GET /api/v1/docker/networks`, for an authenticated client.

Each network of the answer holds the identifier, the name, the driver, the scope, the state of the internal flag, the state of the attachable flag, the date of the creation and the labels.

### Scenario: The host holds networks

- **WHEN** an authenticated client calls the endpoint
- **THEN** the system answers `200` with every network of the host

## The daemon is not reachable

The system SHALL answer `503 Service Unavailable` when the read of a resource of the host fails because the Docker daemon does not answer. The message asks the operator to verify that the server runs and that it is reachable.

The `503` belongs to that failure alone. A read that fails for another reason SHALL answer with the failure that reason carries, so a `503` states an outage of the daemon alone and never hides a fault of the platform.

### Scenario: The daemon does not answer

- **WHEN** the read of a resource of the host fails because the daemon is not reachable
- **THEN** the system answers `503 Service Unavailable` with that message

## The section "Docker"

The system SHALL give a section "Docker" at the route `/docker/:tab`, with one tab for each resource: Containers, Images, Volumes and Networks. The route with no tab, or with a tab it does not know, opens the tab Containers.

Each tab SHALL show its resource in a table, with a button of manual refresh, and it SHALL show its own state of the reading: loading, error or empty. A row of a table opens no view of detail.

### Scenario: The user opens the section

- **WHEN** a signed-in user opens `/docker`
- **THEN** the system opens the tab Containers, with the containers of the host or the state of the reading

### Scenario: The user changes the tab

- **WHEN** the user chooses another tab of the section
- **THEN** the system shows the table of that resource, and it reads it the first time the tab opens

### Scenario: The user asks for a refresh

- **WHEN** the user chooses the button of manual refresh of a tab
- **THEN** the system reads that resource again, and it shows the loading state until the answer arrives

### Scenario: The host holds no resource of a kind

- **WHEN** the host holds no resource of the kind a tab shows
- **THEN** the system shows a message that states that the host holds none, in place of the table
