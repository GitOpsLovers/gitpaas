# The profile of the user, and the second factor

A user of GitPaaS reads nothing about the own account, and changes nothing in it: the table `users` holds no update, the feature of the users holds no controller, and the header shows the literal text `Admin`. This feature adds a section of the profile that shows the account, that changes the display name, the email address and the password, and that turns on a second factor with Google Authenticator. A new feature `profile` of the backend serves it, the platform issues a new pair of tokens after a change of the email address or of the password, and the login takes two steps when the second factor is on. The recovery codes, the upload of an avatar and the confirmation of an email address stay out of scope, because no mailer exists. The avatar shows the initials of the display name, and the backend sends the image of the QR ready. **Before phase 3, the user installs `otplib` and `qrcode` in `apps/backend`.**

## Phase 1 — The data of the account

**Agent:** implementer
**Paths:** `iac/production/migrations/`, `apps/backend/src/features/users/`, `packages/contracts/src/authentication/`

- [x] 1.1 Write `020_users_profile.sql`, which adds to `users` the columns `displayName` (text, nullable), `totpSecret` (text, nullable) and `totpEnabledAt` (timestamptz, nullable).
- [x] 1.2 Add those three columns to `DbUserEntity`, and keep `totpSecret` out of every contract of the wire.
- [x] 1.3 Add to the port `UsersRepository` and to its implementation the methods that update the display name, the email address, the hash of the password and the state of the second factor.
- [x] 1.4 Add `displayName` and a boolean `totpEnabled` to `userSchema` of `packages/contracts`.
- [x] 1.5 Write the unit tests of the entity, of the repository and of the transformer.

## Phase 2 — The endpoints of the profile

**Agent:** implementer
**Paths:** `apps/backend/src/features/profile/`, `packages/contracts/src/profile/`

- [ ] 2.1 Write the contracts of the profile: the read of the profile, the change of the display name, the change of the email address, and the change of the password.
- [ ] 2.2 Create the feature `profile` with its module, its controller `/api/v1/profile` and its use cases, all of them scoped to the user of the token.
- [ ] 2.3 `GET /profile` returns the account with its display name, its role, its date of creation and the state of its second factor.
- [ ] 2.4 `PATCH /profile/name` changes the display name.
- [ ] 2.5 `PATCH /profile/email` changes the email address, refuses an address that another user holds, and returns a new pair of tokens.
- [ ] 2.6 `PATCH /profile/password` verifies the current password, writes the new hash, revokes every refresh token with `revokeAllForUser`, and returns a new pair of tokens.
- [ ] 2.7 Write the unit tests of the controller and of every use case.

## Phase 3 — The second factor

**Agent:** implementer
**Paths:** `apps/backend/src/features/profile/`, `apps/backend/src/features/authentication/`, `packages/contracts/src/`

- [ ] 3.1 `POST /profile/2fa/setup` creates a secret TOTP, seals it with `SecretCipher`, and returns the image of the QR and the key in text.
- [ ] 3.2 `POST /profile/2fa/enable` verifies a code of six digits, and writes `totpEnabledAt`.
- [ ] 3.3 `DELETE /profile/2fa` turns the second factor off for the user of the token.
- [ ] 3.4 `DELETE /users/:id/2fa` turns the second factor off for another user, and the role `admin` alone reaches it.
- [ ] 3.5 `POST /auth/login` answers a challenge with a short token when the second factor is on, and it returns no pair.
- [ ] 3.6 `POST /auth/2fa/verify` takes that challenge and a code of six digits, and it returns the pair of tokens.
- [ ] 3.7 Write the unit tests of every route above, of the seal of the secret and of the two steps of the login.

## Phase 4 — The page of the profile

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/profile/`, `apps/frontend/src/app/app.routes.ts`

- [ ] 4.1 Add the route `profile` under the shell, and its service of the API.
- [ ] 4.2 Build the card of the account: the avatar with the initials, the display name, the email address, the role and the date of creation.
- [ ] 4.3 Build the three forms: the display name, the email address and the password, each one with its own state of loading and of error.
- [ ] 4.4 Build the panel of the second factor: the image of the QR, the field of the code, and the button that turns it off.
- [ ] 4.5 Store the new pair of tokens that a change of the email address or of the password returns.
- [ ] 4.6 Write the unit tests of the page and of the service.

## Phase 5 — The header and the login of two steps

**Agent:** implementer
**Paths:** `apps/frontend/src/app/features/authentication/`, `apps/frontend/src/app/layout/`

- [ ] 5.1 Show the display name, the email address and the avatar of `currentUser` in the header, in place of the literal text `Admin`.
- [ ] 5.2 Add the link to `/profile` in the menu of the header, above the action to sign out.
- [ ] 5.3 Add the second step to the screen of the sign-in: the field of the code of six digits appears when the login answers a challenge.
- [ ] 5.4 Write the unit tests of the header and of the two steps of the sign-in.

## Phase 6 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 6.1 Write the behavior of the profile and of the second factor into `docs/business/`.
- [ ] 6.2 Correct `docs/business/users.md`, `docs/business/auth.md` and `docs/business/frontend-shell.md`, which this feature makes false.
- [ ] 6.3 Delete the folder `docs/roadmap/user-profile-and-2fa/`, and its line of `docs/roadmap.md`.
