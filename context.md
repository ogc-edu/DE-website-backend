# context.md — DE Research Dashboard Backend

Living context document for this repo. Read this first, then `README.md`, `PRD.md`, and `docs/` for depth. Last verified: scan of working tree (clean, all committed).

## What this project is

Backend API for a **Differential Evolution (DE) research dashboard**. Researchers configure experiments — benchmark fitness functions (1–10), mutation schemes (1–10), crossover operators (1–4), selection methods (1–2) — and the backend computes the Cartesian product of models, tracks progress, and stores the lowest fitness value per (model × function) so variants can be compared.

- **Frontend is a separate repo** (`DE-website` SPA) that consumes this API.
- Per PRD, heavy computation is meant to run on **EC2 workers** polled from **AWS SQS**; this repo is the API + data layer only.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 (CommonJS, `require`/`module.exports` — no ESM) |
| Framework | Express `^5.2.1` (mounts at `/api/v1`) |
| DB | MongoDB 7 via Mongoose `^9.1.2` |
| Auth | `jsonwebtoken` + `bcrypt` (salt rounds 10) |
| Validation | Zod `^4.4.3` (middleware `validate()`) |
| Logging | Winston + Morgan (`config/logger.js`, writes `logs/*.log`) |
| Security | Helmet, CORS, httpOnly cookies |
| API docs | swagger-jsdoc + swagger-ui-express at `/api/v1/docs` (annotations live in `routes/*.js`) |
| Testing | Jest 30 + Supertest 7 (4 suites, ~59 cases; README says 58) |
| Containers | Multi-stage `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml` (MongoDB atlas-local + backend) |

## Layout

```
app.js                 # Express app: helmet/json/cookie/cors/morgan → routes → swagger → notFound → errorHandler
server.js              # Entry: connectDB + listen(PORT||3000); SIGTERM → closeDB
config/database.js     # mongoose.connect(MONGODB_URI, { dbName: DB_NAME }); connectDB/closeDB
config/logger.js       # winston: console + logs/error.log + logs/combined.log
models/user.js         # "users" collection; statics login/register; methods generateJwtToken/generateRefreshToken/save/clearRefreshToken
models/simulation.js   # "simulations" collection; statics createSimulation/getSimulation/getSimulationById/deleteSimulation/cancelSimulation
controllers/           # authController(verify,refresh,logout) loginController registerController userController simulationController adminController healthController
routes/index.js        # /health; /simulation (auth); /admin (auth+admin); /user (auth); / (auth routes: login/register/verify/refresh/logout)
validators/            # authValidators.js, simulationValidators.js (Zod schemas)
middleware/            # authMiddleware, adminMiddleware, validate, errorHandler, notFound
docs/                  # README, setup, architecture, authentication, api-reference, models, middleware, testing, swagger.js
tests/                 # setup.js + auth/simulation/admin/user.test.js
Dockerfile, Dockerfile.dev, docker-compose.yml, start-dev.bat (Windows dev bootstrap)
```

## Data models (summary)

**User** (`models/user.js`, collection `users`, timestamps):
`username` (3–50), `email` (unique, lowercase, regex), `password` (`select:false`, hashed pre-save — note typo `require:true` instead of `required:true`), `isVerified` (unused, default false), `role` (`user`|`admin`, default `user`), `isActive` (default true), `refreshToken` (`select:false`, rotation), `profilePicture` (unused), `simulationCount` (unused).

**Simulation** (`models/simulation.js`, collection `simulations`, timestamps):
`userId` (ObjectId, indexed, ownership check basis), `functions`/`methods.{mutation,crossover,selection}` (validated int arrays, ranged 1–10/1–4/1–2), `totalModels` (Cartesian product at creation), `completedModels` (default 0), `progress` (0–100), `status` (`pending|completed|failed|cancelled`, default `pending`, indexed), `simulationData` (array of `{functionId, mutationId, crossoverId, selectionId, lowestFitness}` — the results grid; schema exists, **no code writes it yet**).

## API surface (`/api/v1`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/health` | — | DB readyState, uptime |
| POST | `/login` | — | Zod; sets `refreshToken` httpOnly cookie (7d, sameSite strict) |
| POST | `/register` | — | Zod; password 6–12 chars |
| POST | `/verify` | — | Manual token check; **invalid token → 500 (bug, see Gotchas)** |
| POST | `/refresh` | — | Rotates refresh token; requires cookie match |
| POST | `/logout` | — | Clears cookie + DB token |
| GET | `/user/profile` | Bearer | excludes password/refreshToken |
| PATCH | `/user/profile` | Bearer | username/email; email uniqueness checked |
| PATCH | `/user/password` | Bearer | currentPassword + newPassword (≤12 chars) |
| POST | `/simulation/create` | Bearer | Zod; computes `totalModels`; **does NOT enqueue to SQS** |
| GET | `/simulation/get` | Bearer | `?page=&limit=&status=`; limit 0 = unpaginated |
| GET | `/simulation/get/:id/results` | Bearer | progress + `simulationData` |
| GET | `/simulation/get/:id` | Bearer | ownership check |
| DELETE | `/simulation/delete/:id` | Bearer | ownership check |
| POST | `/simulation/cancel/:id` | Bearer | sets status `cancelled` |
| GET | `/admin/users` | Bearer+admin | paginated, excludes refreshToken |
| GET | `/admin/users/:id` | Bearer+admin | |
| PATCH | `/admin/users/:id/suspend` | Bearer+admin | toggles isActive; cannot suspend admins |
| GET | `/admin/simulations` | Bearer+admin | optional `?userId=` filter |
| DELETE | `/admin/simulations/:id` | Bearer+admin | |
| GET | `/admin/queue` | Bearer+admin | **stub** — returns "SQS integration not configured" |
| GET | `/docs` | — | Swagger UI |

## Auth flow

- Access token: JWT `{userId}` signed `JWT_SECRET`, 1h, sent `Authorization: Bearer`.
- Refresh token: JWT `{userId, jti}` signed `JWT_REFRESH_SECRET`, 7d, stored hashed-in-DB? No — **plaintext** in `users.refreshToken` (`select:false`) + httpOnly cookie. Rotation on each `/refresh`.
- `authMiddleware`: verifies token, loads user (`_id username role isActive`), 401 no/invalid token, 403 suspended. Sets `req.userId`, `req.user`.
- `adminMiddleware`: `req.user.role === "admin"` else 403.
- Ownership: controllers compare `simulation.userId.toString() === req.userId`.
- Password max length 12 — intentional app-wide rule (Zod + model + changePassword).

## Environment variables

Required at runtime: `JWT_SECRET`, `JWT_REFRESH_SECRET` (no defaults → must set). Optional: `MONGODB_URI` (default `mongodb://localhost:27017`), `DB_NAME` (default `Dashboard-Database`), `PORT` (3000), `CORS_ORIGIN` (comma-separated; default `true` = reflect any), `LOG_LEVEL` (info), `NODE_ENV` (switches cookie `secure`, winston format), `MONGODB_URI_TEST` (tests; default `Dashboard-Test-Database?replicaSet=replicaset&directConnection=true`).

> **No `.env` and no `.env.example` exist in the repo** (README references `.env.example`, docs/setup.md documents the vars). Create `.env` from docs/setup.md before running.

## Commands

```bash
npm install            # needed — node_modules currently absent
npm start              # node server.js
npm run dev            # nodemon server.js
npm test               # NODE_ENV=test jest (needs Mongo with replica set!)
npm run test:watch / test:coverage
docker-compose up --build   # mongo (atlas-local, replica set "replicaset") + backend
./start-dev.bat        # Windows: starts de-db container + npm run dev
```

**MongoDB for tests/dev**: both `docker-compose.yml` and `tests/setup.js` require a **replica set** named `replicaset`. `notes.txt` has the standalone command: `docker run -d --name atlas-mongo -p 27017:27017 -v atlas_mongo_data:/data/db -e MONGODB_INITDB_ROOT_USERNAME=root -e MONGODB_INITDB_ROOT_PASSWORD=password123 mongodb/mongodb-atlas-local:8.0.0-...`. Plain local `mongod` without a replica set will fail the test connection.

## Progress check (as of now)

**Done ✅**
- Full auth: register/login/verify/refresh-rotation/logout, RBAC (user/admin), suspension.
- User profile: get/update/change-password (Zod-validated).
- Simulation: create (Cartesian `totalModels`), list (pagination + status filter), single, results, delete, cancel — all ownership-checked.
- Admin: users list/get/suspend, simulations list/delete, queue stub.
- Validation (Zod), structured error handling, winston logging, Swagger docs.
- Docker multi-stage + compose; docs/ suite; 4 Jest/Supertest suites — **58/58 tests passing locally** against the atlas-local container (fixed `tests/setup.js` URI).
- `.env.example` added; local `.env` created (gitignored).
- Quick-win bug fixes: `/verify` invalid/expired token → 401 (was 500); removed dead `User.modifyEmail`; fixed `password` schema `require:`→`required:` typo.

**In progress / stubbed 🟡**
- SQS queue: `GET /admin/queue` is a stub; `createSimulation` persists only — **no SQS push**.
- Progress/results pipeline: `completedModels`, `progress`, `simulationData` schema-ready but nothing writes them (workers are out-of-scope/separate repo per PRD, but there is no worker or producer yet).

**Not started ❌ (mostly PRD out-of-scope)**
- EC2 worker code (separate repo), email verification (`isVerified`), rate limiting, CI/CD, S3/profile pictures, Secrets Manager.

## Gotchas / latent bugs (verified by reading code)

1. ✅ **FIXED** — `POST /verify` with invalid/expired token now returns 401 (`errorHandler` maps `JsonWebTokenError`/`TokenExpiredError`).
2. ✅ **FIXED** — dead buggy `User.modifyEmail` removed; `password` schema `require:`→`required:` typo fixed.
3. **Generic `Error` → HTTP 400** in errorHandler means auth/ownership failures (e.g. "Unauthorized" on cross-user simulation access) surface as 400, not 401/403/404. Tests deliberately assert 400 — changing this ripples through tests.
4. `cancelSimulation` doesn't guard status — a `completed` simulation can be cancelled.
5. Refresh token stored plaintext in DB; single-token rotation means concurrent sessions overwrite each other.
6. `simulationData` subdocs use `required: true` on their fields — fine, but note Mongoose will reject partial result writes until populated with all four ids.
7. `sameSite: "strict"` cookie may complicate cross-site frontend dev if frontend is served from a different origin than the API.
8. `logs/`, `.env`, `node_modules` are gitignored.

## Local dev/test environment (verified working)

- MongoDB: `atlas-mongo` docker container (root:password123, auth enforced, RS name = container hostname). Connection string used in `.env`/`.env.example`/`tests/setup.js`: `mongodb://root:password123@localhost:27017/<db>?directConnection=true&authSource=admin` — no `replicaSet` param (name is hostname, changes per recreate; app/tests don't use transactions).
- `npm test` (58/58) and `npm run dev` both work against it.

## Conventions

- MVC: models own data logic (statics), controllers are thin (try/catch → `next(err)`), routes map URLs.
- CommonJS throughout; controllers named `xController.js`; validators in `validators/`; Zod via `validate(schema)` middleware.
- Ownership & role checks in models/controllers, not middleware (except auth/admin middleware).
- API versioned `/api/v1`; JSDoc `@openapi` annotations in route files feed Swagger.
- All timestamps via `{ timestamps: true }`.
