-- `project_networks` and `service_networks` — the removal of the private network of a project.
--
-- GitPaaS let the user declare a network inside a project and join a service to it, so a
-- row of `project_networks` held one network of one project, and a row of
-- `service_networks` joined one service to one of them. The compose file of a service
-- already declares the network that the service needs, and the deployment attaches the
-- container to it, so the layer of the project duplicated a decision that the repository
-- of the user already carries. The backend dropped the entities, the repositories, the
-- use cases and the routes, so no code reads these tables any more.
--
-- `service_networks` goes first, because its foreign key points at `project_networks`.
-- Both drops use `IF EXISTS`, so an installation that already ran this file, and an
-- installation that never created the tables, both run it without an error.

DROP TABLE IF EXISTS "service_networks";

DROP TABLE IF EXISTS "project_networks";
