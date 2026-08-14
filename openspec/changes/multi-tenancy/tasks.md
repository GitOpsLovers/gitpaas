## 1. The owner of a namespace

- [ ] 1.1 Add the owner to the domain model of a namespace and to its entity, as a reference to a user.
- [ ] 1.2 Write the user who creates a namespace as its owner, in the use case of the creation.
- [ ] 1.3 Create the migration that adds the column, allows an empty value at first, fills every row with the owner that the operator names, and then sets the column to hold a value always.
- [ ] 1.4 State in the release notes that the operator must name that owner, and that the platform gives no operation to move a resource afterwards.
- [ ] 1.5 **Decision needed.** Decide if this change adds an operation that moves a namespace to another owner. An installation that runs with several users needs it after the upgrade.

## 2. The limit of the ownership

- [ ] 2.1 Give the caller to every use case that reads or writes a namespace, and limit the query by the owner.
- [ ] 2.2 Do the same for the projects, by the owner of the namespace above them.
- [ ] 2.3 Do the same for the services, by the owner of the namespace above their project.
- [ ] 2.4 Do the same for the deployments, for the containers and for the networks, which all hang from a service.
- [ ] 2.5 Answer `404` and never `403` for a resource of another user, so the path gives away nothing.
- [ ] 2.6 Let a user with the role `admin` pass every limit of the ownership.
- [ ] 2.7 Create the specs of each list and of each read, with a caller who does not own the resource.

## 3. The role that the system enforces

- [ ] 3.1 Make the guard of the role general, which the change `source-control-providers` applies to the routes of the providers only.
- [ ] 3.2 Apply the role `admin` to the write routes of the users.
- [ ] 3.3 Verify that no other endpoint gains a restriction of the role, because the limit of the ownership does that work.
- [ ] 3.4 Update the specs of the guard for the new routes.

## 4. The management of the users

- [ ] 4.1 Create the controller and the service of the users, with the list, the read, the creation, the change of the role and the change of the state.
- [ ] 4.2 Hash the password with argon2 in the use case of the creation, as the seed of the development already does.
- [ ] 4.3 Give no hash of a password in any answer.
- [ ] 4.4 Refuse the operation when an administrator deactivates their own account, so an installation never loses its last administrator.
- [ ] 4.5 Give no operation that removes a user, because the resources of that user would lose their owner.
- [ ] 4.6 Create the specs of the controller, with an assertion that no answer carries a hash of a password.

## 5. The user of a deployment

- [ ] 5.1 Change `triggeredBy` into a reference to a user that can be empty, in the domain model and in the entity.
- [ ] 5.2 Write the authenticated user into the record, in place of the fixed text `system`.
- [ ] 5.3 Create the migration that changes the column and leaves the rows of today empty.
- [ ] 5.4 Update the specs of the trigger for a user and for a run with no user.

## 6. The frontend

- [ ] 6.1 Show the user who triggered a deployment in the tab of the deployments, and say "automatic" when the record holds none.
- [ ] 6.2 Create the section that manages the users, with the list, the creation, the change of the role and the change of the state.
- [ ] 6.3 Show the section of the users only to a user with the role `admin`, and hide its entry of the sidebar for the others.
- [ ] 6.4 Read the role of the profile of the current user, which `GET /auth/me` already gives.
- [ ] 6.5 Create the specs of the section of the users and of the entry of the deployment.

## 7. The documentation

- [ ] 7.1 Correct the sentence of `docs/backend-business.md` that says that the role restrictions are not enforced yet.
- [ ] 7.2 Add the ownership to the section of the domain model of `docs/backend-business.md`.
