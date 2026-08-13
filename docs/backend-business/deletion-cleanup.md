# Deletion & cleanup

- **If you delete a deployment**, the log rows of that deployment are removed, and the DB cascade removes the remaining data.
- **If you delete a service**, the system removes its Docker resources (it force-removes the containers with the label, the compose networks and the images that were built for it, but it keeps the shared images that were pulled), removes the log rows of each deployment, and lets the DB cascade remove the deployment rows and the log rows.
