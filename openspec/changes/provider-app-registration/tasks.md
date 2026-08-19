## 1. The permissions that a provider needs

- [x] 1.1 Create a constant of the domain in `apps/backend/src/features/providers/domain/` that names the needed permissions: `contents: read` and `metadata: read`.
- [x] 1.2 Create the function that compares the permissions of an application against that constant, and that answers the missing ones. Order the levels `read`, `write` and `admin`, and count a higher level as enough.
- [x] 1.3 Write the unit tests of that comparison: the exact level, a higher level, an absent permission and an unknown level.

## 2. The answer of the test of the connection

- [x] 2.1 Change `ProviderConnectionTest` in `domain/models/provider.models.ts` to `{ outcome, missingPermissions }`, with the outcomes `ok`, `unauthorized` and `incomplete`.
- [x] 2.2 Change `verifyCredentials` in `domain/ports/provider-client.port.ts` so that it answers whether GitHub accepts the credentials together with the permissions of the application.
- [x] 2.3 Change `GithubProviderClientAdapter.verifyCredentials` so that it reads the `permissions` of the answer of `GET /app`, and gives them back.
- [x] 2.4 Change the use case of the test so that it compares the permissions with the function of 1.2, and that it builds the outcome.
- [x] 2.5 Update the existing tests of the adapter, of the use case and of the controller for the new shape.

## 3. The record of the pending registration

- [x] 3.1 Create the domain model of the pending registration in `features/providers/domain/models/`, with the step `awaiting_creation` and the step `awaiting_installation`.
- [x] 3.2 Create the entity `DbProviderRegistrationEntity` in `infrastructure/database/`, with a unique index on the state.
- [x] 3.3 Create the SQL migration `iac/production/migrations/012_provider_registrations.sql`. Check the highest number in that folder first, because another change may already hold `012`.
- [x] 3.4 Create the port of the repository and its implementation, with the reads by state, the write, the change and the removal by date.
- [x] 3.5 Create the transformer between the entity and the model, and seal the private key with `core/infrastructure/crypto/secret-cipher.adapter.ts`.
- [x] 3.6 Write the unit tests of the repository and of the transformer, and verify that no clear key leaves them.

## 4. The conversion of a manifest at the port of the provider

- [ ] 4.1 Add to `provider-client.port.ts` the operation that converts a temporary code into the configuration of an application. It takes no credentials of a provider.
- [ ] 4.2 Implement that operation in the adapter of GitHub, with `POST /app-manifests/{code}/conversions` and an Octokit that carries no authentication.
- [ ] 4.3 Give back the identifier of the application, its short name and its private key. Give back no client secret and no secret of a webhook.
- [ ] 4.4 Classify a failure of the conversion with the translator that the adapter already uses, and answer `400` for a code that GitHub refuses.
- [ ] 4.5 Write the unit tests of the conversion: the success, the code that is used, the code that is too old.

## 5. The three use cases of the registration

- [ ] 5.1 Create the use case that starts a registration. It refuses a name that another provider carries, it generates the state of 32 random bytes, it writes the row with the date of the end of its life at twelve hours, and it answers with the state, the manifest and the address of GitHub.
- [ ] 5.2 Build the manifest inside that use case, from the constant of 1.1 and from the addresses of the return. Declare no webhook and no event, and declare the application as not public.
- [ ] 5.3 Choose the address of GitHub from the owner: the personal form, or the form of the organization with its login.
- [ ] 5.4 Create the use case of the conversion. It reads the row by the state, it refuses a row that is not at the step `awaiting_creation`, it converts the code, it writes the identifier, the short name and the sealed key, and it moves the step.
- [ ] 5.5 Create the use case that ends the registration. It reads the row by the state, it refuses a row that is not at the step `awaiting_installation`, and it writes the provider and removes the row in one transaction.
- [ ] 5.6 Refuse an expired row in each of the three use cases.
- [ ] 5.7 Write the unit tests of the three use cases, with every refusal that the spec names.

## 6. The endpoints of the registration

- [ ] 6.1 Create the DTOs of the three calls, with the validation of the owner and of the login of the organization.
- [ ] 6.2 Add the three routes under `providers/registrations` to `ProvidersController`, all of them marked with the role `admin`.
- [ ] 6.3 Answer `409` for a name that another provider carries, `404` for a state that no row carries, and `409` for a step that does not agree.
- [ ] 6.4 Enrich the telemetry with the state of the registration, and never with the private key.
- [ ] 6.5 Write the tests of the controller for the three routes and for each answer of failure.

## 7. The removal of the abandoned registrations

- [ ] 7.1 Register `ScheduleModule.forRoot()` in the module of the application. It is the first scheduled job of the backend.
- [ ] 7.2 Create the job that removes the rows that passed their date, with a period of one hour.
- [ ] 7.3 Call GitHub in no part of that job, and remove no GitHub App.
- [ ] 7.4 Write the test of the job: it removes the rows that passed their date, and it keeps the others.

## 8. The two paths on the screen of the creation

- [ ] 8.1 Add the choice of the two paths to `pages/providers/add/`, above the form. Show no field before the user chooses.
- [ ] 8.2 Add the statement of the two permissions above the fields of `provider-form.component`, and add no control to that form.
- [ ] 8.3 Create the component that asks the name and the owner, with the field of the login that appears only for an organization.
- [ ] 8.4 Add to `providers-api.repository.ts` the three calls of the registration.
- [ ] 8.5 Submit the manifest to GitHub with a form that the browser sends, whose one field is the manifest, and whose action is the address that the API gave.
- [ ] 8.6 Write the tests of the choice of the path, of the field of the login and of the statement of the permissions.

## 9. The screens that receive the returns of GitHub

- [ ] 9.1 Create the route of the return after the creation. It reads the code and the state, and it calls the conversion.
- [ ] 9.2 Send the browser to `github.com/apps/{slug}/installations/new?state=…` after a conversion that succeeds.
- [ ] 9.3 Create the route of the return after the installation. It reads the identifier of the installation and the state, it calls the end of the registration, and it opens `/providers` with the message of success.
- [ ] 9.4 Send a user with no session to the sign-in, and keep the address of the return.
- [ ] 9.5 Show a message of failure that names the step that failed, that states that the App may exist on GitHub, and that gives a link to `/providers`.
- [ ] 9.6 Register the two routes in `app.routes.ts`, under the guard that the other screens of the providers use.
- [ ] 9.7 Write the tests of the two screens: the success, the failure of the call and the absent session.

## 10. The third state of the card

- [ ] 10.1 Change the model of the frontend for the new shape of the answer of the test.
- [ ] 10.2 Show a state of warning on the card for the outcome `incomplete`, and name each missing permission.
- [ ] 10.3 Update the tests of the card for the three outcomes.

## 11. The end

- [ ] 11.1 Run the tests of the backend and of the frontend with the commands of `package.json`. Run no test of Playwright.
- [ ] 11.2 Update `docs/backend-architecture.md` and `docs/frontend-architecture.md` for the registration.
- [ ] 11.3 Run `rtk openspec validate provider-app-registration --strict`.
