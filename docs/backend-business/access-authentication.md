# Access & authentication

All the API is **private by default**. Each endpoint needs a valid access token. There are only a small number of public endpoints: the login, the token refresh, the logout and the readiness probe. There is **no public sign-up**. An administrator makes the users with a different tool, because the application has no flow to create a user.

**Login.** A user sends the email and the password to `POST /api/v1/auth/login`. The API compares the password with an argon2 hash. If the data is correct, the API returns an **access token** with a short life and a **refresh token** with a longer life. The login has a rate limit, which makes a brute-force attack slower.

**Use of the API.** A caller sends the access token as a Bearer token. Each request examines again if the user is available and **active**. Thus, if you deactivate a user, that user has no more access immediately and not at the expiry of the token.

**Refresh with rotation.** When the access token expires, the client sends its refresh token to `POST /api/v1/auth/refresh` and gets a new pair of tokens. The refresh tokens are stored only as hashes, and they are **rotated**: each refresh revokes the old token and gives a new token. If a token is used again after a rotation or after a logout, the API rejects it. Thus a stolen token that is sent again does not operate.

**Logout.** `POST /api/v1/auth/logout` revokes a refresh token. This operation is idempotent. `GET /api/v1/auth/me` returns the public profile of the current user.

> Each user has a role (`admin` or `user`), but the role restrictions are **not enforced yet**. Currently, each authenticated user can do each action.
