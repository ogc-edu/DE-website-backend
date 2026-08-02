# Setup Guide

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 20+ | Required by Express 5 and Dockerfile |
| MongoDB | 7+ | Local install or via Docker Compose |
| Docker | latest | Optional, for containerized deployment |
| npm | 10+ | Comes with Node.js |

## Option 1: Local Development (without Docker)

### 1. Clone the repository

```bash
git clone <repository-url>
cd DE-website-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
MONGODB_URI=mongodb://localhost:27017/Dashboard-Database?replicaSet=replicaset&directConnection=true
JWT_SECRET=your-secure-jwt-secret
JWT_REFRESH_SECRET=your-secure-refresh-secret
DB_NAME=Dashboard-Database
CORS_ORIGIN=http://localhost:3001,http://localhost:5173
```

> **Important:** Use strong, random secrets for `JWT_SECRET` and `JWT_REFRESH_SECRET` in production. The `.env` file is gitignored and will not be committed.

### 4. Start MongoDB

Ensure MongoDB is running locally with a replica set. The replica set is required for Mongoose `timestamps` and transactions.

**Start MongoDB with replica set (local install):**
```bash
mongod --replSet replicaset --port 27017
```

**Initialize the replica set (first run only):**
```bash
mongosh --eval "rs.initiate({ _id: 'replicaset', members: [{ _id: 0, host: 'localhost:27017' }] })"
```

### 5. Start the development server

```bash
npm run dev
```

The server starts on `http://localhost:3000` with nodemon hot-reload.

### 6. Verify the server is running

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "OK",
  "database": "connected",
  "uptime": 1.5,
  "timestamp": "2026-07-13T13:00:00.000Z"
}
```

---

## Option 2: Docker Compose (recommended for development)

Docker Compose starts both MongoDB and the backend with a single command.

### 1. Configure environment

The `docker-compose.yml` reads from `.env` (see step 3 above). The `MONGODB_URI` is overridden in the compose file to use the Docker network hostname `mongo` instead of `localhost`.

### 2. Start all services

```bash
docker-compose up --build
```

This will:
- Start a MongoDB container (mongodb-atlas-local 8.0.0) with replica set auto-initiation
- Build and start the backend container with hot-reload via nodemon
- Wait for MongoDB health check before starting the backend

### 3. Verify

```bash
curl http://localhost:3000/api/v1/health
```

### 4. Stop services

```bash
docker-compose down
```

To remove the MongoDB data volume:
```bash
docker-compose down -v
```

---

## Option 3: Docker (production build)

### 1. Build the production image

```bash
docker build -t de-backend:latest .
```

The multi-stage Dockerfile:
- **Builder stage:** Copies package.json, runs `npm ci --omit=dev` (production deps only)
- **Final stage:** Copies node_modules and source, runs `node server.js`

### 2. Run the container

```bash
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/Dashboard-Database \
  -e JWT_SECRET=your-secret \
  -e JWT_REFRESH_SECRET=your-refresh-secret \
  -e DB_NAME=Dashboard-Database \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=https://your-frontend.com \
  de-backend:latest
```

> Replace `host.docker.internal` with your MongoDB host. In production, this would be your MongoDB Atlas URI or EC2 MongoDB instance.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | yes | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | no | `Dashboard-Database` | Database name |
| `JWT_SECRET` | yes | — | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | yes | — | Secret for signing refresh tokens |
| `CORS_ORIGIN` | no | `true` (allow all) | Comma-separated list of allowed origins |
| `PORT` | no | `3000` | Server port |
| `NODE_ENV` | no | `development` | Environment (`production` enables secure cookies) |
| `LOG_LEVEL` | no | `info` | Winston log level (`error`, `warn`, `info`, `debug`) |

---

## npm Scripts

| Script | Command | Description |
|---|---|---|
| `npm start` | `node server.js` | Start production server |
| `npm run dev` | `nodemon server.js` | Start dev server with hot reload |
| `npm test` | `cross-env NODE_ENV=test jest` | Run all tests |
| `npm run test:watch` | `cross-env NODE_ENV=test jest --watch` | Run tests in watch mode |
| `npm run test:coverage` | `cross-env NODE_ENV=test jest --coverage` | Run tests with coverage report |

---

## Creating an Admin User

There is no admin registration endpoint. To create an admin user:

### Via MongoDB Shell

```bash
mongosh "mongodb://localhost:27017/Dashboard-Database"
```

```js
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { role: "admin" } }
)
```

### Via Node Script

```bash
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');
(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });
  await User.create({ username: 'admin', email: 'admin@example.com', password: 'adminpass', role: 'admin' });
  console.log('Admin user created');
  await mongoose.connection.close();
})();
"
```

---

## Swagger UI

Once the server is running, access the interactive API documentation at:

```
http://localhost:3000/api/v1/docs
```

This provides a full UI for exploring and testing all API endpoints, including authentication via Bearer token.

---

## Troubleshooting

### MongoDB connection errors

**Error:** `MongoServerSelectionError: connect ECONNREFUSED`
- Ensure MongoDB is running: `mongod --replSet replicaset`
- Check the `MONGODB_URI` in `.env` matches your MongoDB port

**Error:** `MongoServerError: not running with replication`
- The replica set must be initialized: `rs.initiate(...)` (see step 4 above)

### Port already in use

**Error:** `EADDRINUSE: address already in use :::3000`
- Change the `PORT` in `.env` or stop the process using port 3000

### Cookie not being set in browser

- Ensure `CORS_ORIGIN` includes your frontend URL
- Ensure the frontend sends `credentials: 'include'` in fetch/axios requests
- In production, `secure: true` requires HTTPS

### Tests failing with connection errors

- Ensure MongoDB is running locally
- Tests use `Dashboard-Test-Database` as the database name (separate from dev)
- The test setup in `tests/setup.js` cleans all collections between tests
