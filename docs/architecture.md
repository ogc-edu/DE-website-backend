# Architecture

## Overview

The backend follows a layered MVC-inspired architecture built on Express 5. Each concern is separated into its own directory with clear responsibilities.

```
Researcher (React SPA, separate repo)
    |  HTTP (JWT Bearer token)
    v
Express 5 Backend (Dockerized)
    |  Middleware pipeline: helmet > json > cookies > cors > morgan > routes
    v
Mongoose Models (User, Simulation)
    |
    v
MongoDB (replica set)
```

## Project Structure

```
DE-website-backend/
├── app.js                      # Express app setup (middleware, routes, error handling)
├── server.js                   # Server entry point (DB connect, listen, graceful shutdown)
├── package.json                # Dependencies, scripts, Jest config
├── Dockerfile                  # Production image (multi-stage, Node 20 slim)
├── Dockerfile.dev              # Development image (nodemon, hot reload)
├── docker-compose.yml          # MongoDB + backend services
├── .env                        # Environment variables (gitignored)
├── .dockerignore
├── .gitignore
│
├── config/
│   ├── database.js             # MongoDB connection (connectDB, closeDB)
│   └── logger.js               # Winston logger config (console + file transports)
│
├── controllers/
│   ├── authController.js       # verify, refresh, logout handlers
│   ├── loginController.js      # login handler (sets refresh token cookie)
│   ├── registerController.js   # register handler
│   ├── simulationController.js# create, get, delete, cancel, results handlers
│   ├── adminController.js      # admin: users, simulations, queue, suspend
│   ├── userController.js       # profile view/update, password change
│   └── healthController.js     # health check with DB status
│
├── middleware/
│   ├── authMiddleware.js       # JWT verification, user lookup, isActive check
│   ├── adminMiddleware.js      # role === "admin" check
│   ├── validate.js             # Generic Zod validation middleware factory
│   ├── errorHandler.js         # Centralized error handler (Mongoose + custom)
│   └── notFound.js             # 404 handler for unmatched routes
│
├── models/
│   ├── user.js                 # User schema + statics + methods (bcrypt, JWT)
│   └── simulation.js           # Simulation schema + statics (CRUD, pagination)
│
├── routes/
│   ├── index.js                # Route mounting point (all /api/v1 routes)
│   ├── authRoutes.js           # /api/v1/login, /register, /verify, /refresh, /logout
│   ├── simulationRoutes.js     # /api/v1/simulation/* (auth-protected)
│   ├── adminRoutes.js          # /api/v1/admin/* (auth + admin-protected)
│   ├── userRoutes.js           # /api/v1/user/* (auth-protected)
│   └── healthRoutes.js         # (removed — health is inline in index.js)
│
├── validators/
│   ├── authValidators.js       # Zod schemas: register, login, profile, password
│   └── simulationValidators.js# Zod schema: create simulation
│
├── docs/
│   ├── swagger.js              # Swagger/OpenAPI spec generation
│   ├── README.md               # Documentation index
│   ├── api-reference.md        # Complete API documentation
│   ├── architecture.md         # This file
│   ├── models.md               # Database schema reference
│   ├── authentication.md       # Auth flow documentation
│   ├── middleware.md           # Middleware documentation
│   ├── setup.md                # Installation guide
│   └── testing.md              # Testing guide
│
├── tests/
│   ├── setup.js                # Test DB setup, beforeEach cleanup, afterAll teardown
│   ├── auth.test.js            # Auth endpoint tests (18 tests)
│   ├── simulation.test.js      # Simulation endpoint tests (17 tests)
│   ├── admin.test.js           # Admin endpoint tests (13 tests)
│   └── user.test.js            # User profile endpoint tests (10 tests)
│
└── logs/                       # Winston log files (gitignored)
    ├── error.log               # Error-level logs only
    └── combined.log            # All logs
```

## Request Lifecycle

Every request passes through the following pipeline:

```
Incoming Request
    |
    v
helmet()              -- Security headers (XSS, no-sniff, frameguard, etc.)
    |
    v
express.json()        -- Parse JSON body
    |
    v
express.urlencoded()  -- Parse URL-encoded body
    |
    v
cookieParser()        -- Parse cookies (for refreshToken)
    |
    v
cors()                -- CORS with configurable origins
    |
    v
morgan()              -- HTTP request logging (piped to Winston)
    |
    v
/api/v1 routes        -- Route matching
    |
    v
[authMiddleware]      -- (if protected route) JWT verify, user lookup, isActive check
    |
    v
[adminMiddleware]     -- (if admin route) role === "admin" check
    |
    v
[validate()]          -- (if Zod schema attached) Body validation
    |
    v
Controller            -- Business logic
    |
    v
Model (Mongoose)      -- Database operation
    |
    v
Response sent
    |
    v
notFound()            -- (if no route matched) 404
    |
    v
errorHandler()        -- (if error thrown) Centralized error response
```

## Design Decisions

### App/Server Separation

The Express app is defined in `app.js` and the server startup logic is in `server.js`. This separation allows test files to `require("./app")` without starting the HTTP server, enabling supertest to test against the app instance directly.

### Route Mounting

All routes are mounted under `/api/v1` in `app.js`. The `routes/index.js` file acts as the central router that distributes to sub-routers:

| Mount Point | Middleware | Sub-Router |
|---|---|---|
| `/api/v1/health` | none | inline handler |
| `/api/v1/simulation` | authMiddleware | simulationRoutes |
| `/api/v1/admin` | authMiddleware + adminMiddleware | adminRoutes |
| `/api/v1/user` | authMiddleware | userRoutes |
| `/api/v1/` | none | authRoutes (login, register, etc.) |

### Route Ordering

Within `simulationRoutes.js`, the more specific route `/get/:simulationId/results` is registered **before** the less specific `/get/:simulationId` to prevent the parameterized route from swallowing the `/results` suffix.

### Error Handling

All controllers wrap their logic in `try/catch` and pass errors to `next(err)`. The centralized `errorHandler` middleware in `middleware/errorHandler.js` handles:

- **CastError** (Mongoose) → 404
- **Duplicate key (code 11000)** → 400
- **ValidationError** (Mongoose) → 400 with field-specific messages
- **Generic Error** (manual `throw new Error()`) → 400
- **Unhandled** → 500

### Logging

Winston is configured with two file transports:
- `logs/error.log` — only error-level messages
- `logs/combined.log` — all log levels

In development, console output is colorized with timestamps. In production, logs are JSON-formatted for machine parsing.

Morgan logs HTTP requests in `combined` format, piped through Winston's info level.

### Security Layers

1. **Helmet** — sets HTTP security headers
2. **CORS** — configurable origin whitelist via `CORS_ORIGIN` env var
3. **JWT** — signed with `JWT_SECRET`, 1-hour expiry
4. **Refresh token rotation** — new token on each refresh, old token invalidated
5. **httpOnly cookies** — refresh tokens not accessible via JavaScript
6. **bcrypt** — passwords hashed with salt rounds of 10
7. **Zod validation** — input sanitized (trim, lowercase) and validated before reaching controllers
8. **Suspended user blocking** — `isActive: false` users blocked at login and middleware level

### Docker Setup

**Production (`Dockerfile`):** Multi-stage build — builder stage installs production-only deps, final stage copies `node_modules` and source. Runs `node server.js`.

**Development (`Dockerfile.dev`):** Single stage, installs all deps, runs `npx nodemon -L server.js` for hot reload.

**docker-compose.yml:** Two services:
- `mongo` — MongoDB Atlas Local 8.0.0 with replica set health check
- `backend` — built from `Dockerfile.dev`, mounts source for hot reload, depends on `mongo` being healthy

### Graceful Shutdown

`server.js` listens for `SIGTERM` and closes the MongoDB connection before exiting, ensuring no in-flight database operations are left hanging during container orchestration events.

## Out of Scope (per PRD)

- Frontend SPA (separate repo)
- S3/profile picture upload
- AWS Secrets Manager (env vars suffice for v1)
- Email verification flow (`isVerified` field deferred)
- Worker/EC2-side code (this repo is the backend API only)
- CI/CD pipeline
- Rate limiting
- WebSocket/polling strategy (frontend concern)
- AWS SQS integration (queue endpoint is a stub)
