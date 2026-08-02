# REASONIX.md — DE Research Dashboard Backend

## Stack
- **Runtime** — Node.js (CommonJS modules, `require`/`module.exports`)
- **Framework** — Express 5 (`package.json`: `express: "^5.2.1"`)
- **Database** — MongoDB via Mongoose 9 (`mongoose: "^9.1.2"`)
- **Auth** — JWT (`jsonwebtoken`) + bcrypt password hashing
- **Key deps** — cors, dotenv, chalk (colored logs), nodemon (dev)

## Layout
- `server.js` — entry point; connects DB, registers middleware & routes, starts on `PORT` (default 3000)
- `config/database.js` — Mongoose connection (`MONGODB_URI` env, default `mongodb://localhost:27017`, DB `Dashboard-Database`)
- `models/` — Mongoose schemas (`user.js`, `simulation.js`) with static CRUD methods
- `controllers/` — request handlers; wrap logic in try/catch, pass errors to `next(err)`
- `routes/` — Express routers mounted under `/api`; `index.js` composes sub-routers
- `middleware/` — `authMiddleware.js` (JWT verification), `errorHandler.js`, `notFound.js`

## API Endpoints
| Method | Path | Auth | Purpose |
| ------ | ---- | ---- | ------- |
| GET | `/api/health` | No | Health check |
| POST | `/api/login` | No | Login (returns JWT) |
| POST | `/api/register` | No | Register user |
| POST | `/api/verify` | No | Verify JWT + return user data |
| POST | `/api/simulation/create` | Yes | Create simulation |
| GET | `/api/simulation/get` | Yes | List all user simulations |
| GET | `/api/simulation/get/:id` | Yes | Single simulation |
| DELETE | `/api/simulation/delete/:id` | Yes | Delete simulation (ownership check) |
| POST | `/api/simulation/cancel/:id` | Yes | Cancel simulation (ownership check) |

## Commands
- **`npm start`** — `node server.js`
- **`npm run dev`** — `nodemon server.js` (auto-restart on changes)

## Conventions
- **MVC** — models (data logic), controllers (request handling), routes (URL mapping)
- **CommonJS** — no ESM imports anywhere
- **Error flow** — controllers `next(err)` → `middleware/errorHandler.js` handles CastError, duplicate key (11000), ValidationError, generic Error
- **JWT auth** — `Authorization: Bearer <token>` header; `authMiddleware` attaches `req.userId`; simulation ownership checked by comparing `simulation.userId` to `req.userId`
- **Password handling** — user `password` field has `select: false`; login statics method explicitly calls `.select('password')`; pre-save hook hashes with bcrypt (salt rounds 10)
- **Mongoose statics** — CRUD exposed via static methods on schema (e.g. `users.login()`, `simulations.createSimulation()`) rather than inline in controllers

## Watch out for
- **No test suite or linter** — add before restructuring; no `eslint`, `prettier`, or test frameworks in `devDependencies`
- **Express 5** — error-handling middleware signature changed; 4-arg handler (`err, req, res, next`) must be registered last
- **`.env` required** — `JWT_SECRET`, `MONGODB_URI` (or fallback to localhost), `DB_NAME` must be set at runtime
- **`simulationData` is unvalidated** — Mongoose `type: []` (mixed array) with no schema; any shape accepted
