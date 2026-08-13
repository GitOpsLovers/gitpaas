# Domain model

A **project** is a group of **services**. A service is a unit that you can deploy. It points to a Git repository, to a compose file path and to a deployment branch. A **deployment** is one attempt to start the Docker Compose stack of a service on the server. A **user** is an operator who authenticates to use the API.
