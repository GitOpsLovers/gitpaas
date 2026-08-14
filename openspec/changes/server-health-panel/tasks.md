## 1. The models and the reads

- [x] 1.1 Create the model of the result of the readiness in `apps/frontend/src/app/features/server/domain/models/`, with the aggregate state and the list of the dependencies, and one model for the state of the daemon.
- [x] 1.2 Add a read of `GET /server/readiness` to `apps/frontend/src/app/features/server/infrastructure/api/server-api.repository.ts`, with `httpResource`, as the convention of the frontend asks.
- [x] 1.3 Add a read of `GET /server/status` to the same repository, in the same form.

## 2. The mapping of the answer

- [x] 2.1 Create a pure function under `apps/frontend/src/app/features/server/application/` that maps the value and the error of the readiness into the model that the panel shows, with the three cases of the decision 1 of `design.md`.
- [x] 2.2 Create the equivalent function for the state of the daemon.
- [x] 2.3 Make each function test the shape of the body of an error before it uses it, and fall back to the state of the failed reading.

## 3. The panel

- [x] 3.1 Create a presentational component of the panel under `apps/frontend/src/app/features/server/ui/components/`, which receives the two models and the state of the reading as inputs.
- [x] 3.2 Show one line per dependency, with the name and the state, and one aggregate mark that says that the server is ready only when every dependency is `up`.
- [x] 3.3 Show the information of the daemon when it answers, and a line that says that the daemon is not reachable when it does not.
- [x] 3.4 Show the state of the reading while the two calls run.
- [x] 3.5 Show the message of the failed reading when the body of the error has no usable shape.
- [x] 3.6 Apply the patterns of TailAdmin that the card of the maintenance uses, so the panel matches the screen.

## 4. The screen

- [x] 4.1 Create the container that holds the two reads and gives the mapped models to the panel.
- [x] 4.2 Put the panel above the maintenance in `apps/frontend/src/app/pages/server/server.component.html`.
- [x] 4.3 Verify that the screen makes the two calls one time, and that it makes no call on a timer.

## 5. The specifications of the tests

- [x] 5.1 Cover the two pure functions of the group 2, one test per scenario of the delta of `web-server`: every dependency up, one dependency down, the answer `503` with a body, the call that fails with no body, the daemon that answers and the daemon that does not.
- [x] 5.2 Cover the panel: the aggregate mark, the line of each dependency, the state of the reading and the message of the failed reading.
- [x] 5.3 Run the suite of the frontend with the command of `package.json`, headless, and never with Playwright.
