# API Reference

Base URL: `http://localhost:3000/api/v1`

Interactive docs available at: `http://localhost:3000/api/v1/docs`

---

## Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

### Conventions

| Convention | Description |
|---|---|
| **Auth required** | Endpoints marked with a lock icon require `Authorization: Bearer <token>` |
| **Admin only** | Endpoints marked "Admin" require `role: "admin"` |
| **Validation** | Endpoints with request bodies are validated via Zod schemas |
| **Cookies** | Login and refresh endpoints set/clear an httpOnly `refreshToken` cookie |

### Response Format

**Success:**
```json
{
  "message": "Operation successful",
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Validation error (400):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Please add a valid email" }
  ]
}
```

---

## Auth Endpoints

### POST /api/v1/register

Register a new user account. New users are assigned `role: "user"` by default.

**Request body:**
```json
{
  "username": "researcher1",
  "email": "researcher@example.com",
  "password": "securepass"
}
```

**Validation rules:**
| Field | Type | Rules |
|---|---|---|
| `username` | string | 3–50 chars, trimmed |
| `email` | string | valid email format, lowercased, trimmed |
| `password` | string | 6–12 chars |

**Responses:**
| Status | Description |
|---|---|
| 201 | User registered successfully |
| 400 | Validation error or duplicate email |

**Example success response:**
```json
{
  "success": true,
  "message": "User registered successfully"
}
```

---

### POST /api/v1/login

Authenticate a user and receive an access token. Sets an httpOnly refresh token cookie.

**Request body:**
```json
{
  "email": "researcher@example.com",
  "password": "securepass"
}
```

**Validation rules:**
| Field | Type | Rules |
|---|---|---|
| `email` | string | valid email format, lowercased, trimmed |
| `password` | string | required (min 1 char) |

**Responses:**
| Status | Description |
|---|---|
| 200 | Login successful, returns access token |
| 400 | Invalid credentials or account suspended |

**Example success response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies set:**
- `refreshToken` — httpOnly, secure (in production), sameSite: strict, maxAge: 7 days

---

### POST /api/v1/verify

Verify that an access token is valid. Returns the user data if valid.

**Auth required:** Bearer token

**Responses:**
| Status | Description |
|---|---|
| 200 | Token is valid |
| 401 | No token or invalid token |

**Example success response:**
```json
{
  "status": true,
  "userData": {
    "userId": "6a54e5cc235db65db3a8db8e",
    "username": "researcher1"
  }
}
```

---

### POST /api/v1/refresh

Exchange a valid refresh token cookie for a new access token. The refresh token is rotated (old token invalidated, new token issued).

**Cookies required:** `refreshToken` (set by login)

**Responses:**
| Status | Description |
|---|---|
| 200 | New access token issued, new refresh token cookie set |
| 401 | No refresh token, invalid/expired token, or token mismatch |

**Example success response:**
```json
{
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rotation behavior:** Each call to `/refresh` issues a new refresh token and invalidates the old one. The old token will no longer be accepted on subsequent calls.

---

### POST /api/v1/logout

Invalidate the refresh token and clear the cookie.

**Cookies required:** `refreshToken` (optional — if missing, returns "already logged out")

**Responses:**
| Status | Description |
|---|---|
| 200 | Logged out successfully |

**Example response:**
```json
{
  "message": "Logged out successfully"
}
```

---

## User Endpoints

All user endpoints require authentication.

### GET /api/v1/user/profile

Get the current authenticated user's profile.

**Auth required:** Bearer token

**Responses:**
| Status | Description |
|---|---|
| 200 | User profile returned |
| 404 | User not found |

**Example response:**
```json
{
  "user": {
    "_id": "6a54e5cc235db65db3a8db8e",
    "username": "researcher1",
    "email": "researcher@example.com",
    "role": "user",
    "isActive": true,
    "isVerified": false,
    "simulationCount": 3,
    "createdAt": "2026-07-13T10:00:00.000Z",
    "updatedAt": "2026-07-13T12:00:00.000Z"
  }
}
```

> **Note:** `password` and `refreshToken` fields are never included in the response.

---

### PATCH /api/v1/user/profile

Update the current user's username and/or email.

**Auth required:** Bearer token

**Request body (all fields optional):**
```json
{
  "username": "newusername",
  "email": "newemail@example.com"
}
```

**Validation rules:**
| Field | Type | Rules |
|---|---|---|
| `username` | string | 3–50 chars, trimmed (optional) |
| `email` | string | valid email, lowercased, trimmed (optional) |

**Responses:**
| Status | Description |
|---|---|
| 200 | Profile updated successfully |
| 400 | Email already in use |
| 404 | User not found |

---

### PATCH /api/v1/user/password

Change the current user's password. Requires the current password for verification.

**Auth required:** Bearer token

**Request body:**
```json
{
  "currentPassword": "securepass",
  "newPassword": "newpass123"
}
```

**Validation rules:**
| Field | Type | Rules |
|---|---|---|
| `currentPassword` | string | required |
| `newPassword` | string | 6–12 chars |

**Responses:**
| Status | Description |
|---|---|
| 200 | Password changed successfully |
| 400 | Current password incorrect or new password too long |

> The new password is automatically hashed by the Mongoose `pre('save')` hook before storage.

---

## Simulation Endpoints

All simulation endpoints require authentication. Users can only access their own simulations.

### POST /api/v1/simulation/create

Create a new simulation. The system computes `totalModels` as the Cartesian product of all input arrays.

**Auth required:** Bearer token

**Request body:**
```json
{
  "functions": [1, 2, 3],
  "methods": {
    "mutation": [1, 2],
    "crossover": [1, 2],
    "selection": [1, 2]
  }
}
```

**Validation rules:**
| Field | Type | Range | Min items |
|---|---|---|---|
| `functions` | integer[] | 1–10 | 1 |
| `methods.mutation` | integer[] | 1–10 | 1 |
| `methods.crossover` | integer[] | 1–4 | 1 |
| `methods.selection` | integer[] | 1–2 | 1 |

**`totalModels` calculation:**
```
totalModels = functions.length × mutation.length × crossover.length × selection.length
```
Example: 3 functions × 2 mutation × 2 crossover × 2 selection = 24 models

**Responses:**
| Status | Description |
|---|---|
| 201 | Simulation created |
| 400 | Validation error |
| 401 | Unauthorized |

**Example success response:**
```json
{
  "message": "Simulation created successfully",
  "simulationId": "6a54e5cc235db65db3a8db8f"
}
```

---

### GET /api/v1/simulation/get

List all simulations belonging to the authenticated user. Supports pagination and status filtering.

**Auth required:** Bearer token

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number (only used when `limit` > 0) |
| `limit` | integer | 0 | Items per page (0 = no pagination, return all) |
| `status` | string | — | Filter by status: `pending`, `completed`, `failed`, `cancelled` |

**Responses:**
| Status | Description |
|---|---|
| 200 | List of simulations |
| 401 | Unauthorized |

**Example response (without pagination):**
```json
{
  "simulations": [ { ...simulationObject } ],
  "simulationCount": 5
}
```

**Example response (with pagination, `?page=1&limit=2`):**
```json
{
  "simulations": [ { ...simulationObject } ],
  "simulationCount": 5,
  "currentPage": 1,
  "totalPages": 3
}
```

---

### GET /api/v1/simulation/get/:simulationId

Get a single simulation by its ID.

**Auth required:** Bearer token

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `simulationId` | string | MongoDB ObjectId of the simulation |

**Responses:**
| Status | Description |
|---|---|
| 200 | Simulation details |
| 400 | Simulation not found or unauthorized access |
| 401 | Unauthorized (no/invalid token) |

---

### GET /api/v1/simulation/get/:simulationId/results

Get only the results data for a simulation — a lighter payload focused on the results grid.

**Auth required:** Bearer token

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `simulationId` | string | MongoDB ObjectId of the simulation |

**Responses:**
| Status | Description |
|---|---|
| 200 | Results data returned |
| 400 | Simulation not found or unauthorized access |

**Example response:**
```json
{
  "simulationId": "6a54e5cc235db65db3a8db8f",
  "status": "completed",
  "totalModels": 24,
  "completedModels": 24,
  "progress": 100,
  "simulationData": [
    {
      "functionId": 1,
      "mutationId": 1,
      "crossoverId": 1,
      "selectionId": 1,
      "lowestFitness": 0.0023
    },
    {
      "functionId": 1,
      "mutationId": 1,
      "crossoverId": 1,
      "selectionId": 2,
      "lowestFitness": 0.0019
    }
  ]
}
```

> **Note:** `simulationData` starts empty and is populated by EC2 workers as they process each model. Each entry represents one combination of (functionId × mutationId × crossoverId × selectionId) with its lowest fitness value.

---

### DELETE /api/v1/simulation/delete/:simulationId

Delete a simulation. Only the simulation owner can delete it.

**Auth required:** Bearer token

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `simulationId` | string | MongoDB ObjectId of the simulation |

**Responses:**
| Status | Description |
|---|---|
| 200 | Simulation deleted successfully |
| 400 | Not found or unauthorized |

---

### POST /api/v1/simulation/cancel/:simulationId

Cancel a pending simulation. Sets status to `cancelled`. Only the simulation owner can cancel it.

**Auth required:** Bearer token

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `simulationId` | string | MongoDB ObjectId of the simulation |

**Responses:**
| Status | Description |
|---|---|
| 200 | Simulation cancelled successfully |
| 400 | Not found or unauthorized |

---

## Admin Endpoints

All admin endpoints require both authentication (`authMiddleware`) and admin role (`adminMiddleware`).

### GET /api/v1/admin/users

List all users with pagination.

**Auth required:** Bearer token + Admin role

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page |

**Responses:**
| Status | Description |
|---|---|
| 200 | Paginated list of users |
| 401 | Unauthorized (no/invalid token) |
| 403 | Admin access required |

**Example response:**
```json
{
  "userCount": 25,
  "currentPage": 1,
  "totalPages": 2,
  "users": [
    {
      "_id": "6a54e5cc235db65db3a8db8e",
      "username": "researcher1",
      "email": "researcher@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-07-13T10:00:00.000Z"
    }
  ]
}
```

> `refreshToken` is never included in the response.

---

### GET /api/v1/admin/users/:id

Get a single user's details by ID.

**Auth required:** Bearer token + Admin role

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId of the user |

**Responses:**
| Status | Description |
|---|---|
| 200 | User details |
| 404 | User not found |

---

### PATCH /api/v1/admin/users/:id/suspend

Toggle a user's active/suspended status. Suspended users cannot login or access protected routes.

**Auth required:** Bearer token + Admin role

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId of the user |

**Responses:**
| Status | Description |
|---|---|
| 200 | User status toggled |
| 400 | Cannot suspend an admin user |
| 404 | User not found |

**Example response (suspending):**
```json
{
  "message": "User suspended successfully",
  "userId": "6a54e5cc235db65db3a8db8e",
  "isActive": false
}
```

**Example response (reactivating):**
```json
{
  "message": "User activated successfully",
  "userId": "6a54e5cc235db65db3a8db8e",
  "isActive": true
}
```

> Admin users cannot be suspended. The endpoint returns 400 if the target user has `role: "admin"`.

---

### GET /api/v1/admin/simulations

List all simulations across all users. Optionally filter by userId.

**Auth required:** Bearer token + Admin role

**Query parameters:**
| Param | Type | Description |
|---|---|---|
| `userId` | string | Filter simulations by a specific user's ID |

**Responses:**
| Status | Description |
|---|---|
| 200 | List of simulations |
| 403 | Admin access required |

---

### DELETE /api/v1/admin/simulations/:id

Delete any simulation regardless of ownership.

**Auth required:** Bearer token + Admin role

**Path parameters:**
| Param | Type | Description |
|---|---|---|
| `id` | string | MongoDB ObjectId of the simulation |

**Responses:**
| Status | Description |
|---|---|
| 200 | Simulation deleted successfully |
| 404 | Simulation not found |

---

### GET /api/v1/admin/queue

Get the SQS queue status. Currently a stub — returns a placeholder response since SQS integration is not yet implemented.

**Auth required:** Bearer token + Admin role

**Responses:**
| Status | Description |
|---|---|
| 200 | Queue status |

**Example response:**
```json
{
  "message": "SQS integration not configured",
  "queue": null
}
```

---

## Health Check

### GET /api/v1/health

Check the server and database status. No authentication required.

**Responses:**
| Status | Description |
|---|---|
| 200 | Server is running |

**Example response:**
```json
{
  "status": "OK",
  "database": "connected",
  "uptime": 3600.5,
  "timestamp": "2026-07-13T13:00:00.000Z"
}
```

**Database states:**
| Value | Description |
|---|---|
| `connected` | MongoDB connection is active |
| `disconnected` | MongoDB is not connected |
| `connecting` | Connection in progress |
| `disconnecting` | Disconnection in progress |
| `unknown` | Unrecognized state |

---

## Error Codes Summary

| Status | Description | When |
|---|---|---|
| 200 | OK | Successful GET, PATCH, POST (logout, refresh) |
| 201 | Created | Successful register, simulation create |
| 400 | Bad Request | Validation error, duplicate, invalid credentials, unauthorized resource access |
| 401 | Unauthorized | Missing or invalid JWT token, missing/invalid refresh token |
| 403 | Forbidden | Suspended user, admin access required |
| 404 | Not Found | User or simulation not found |
| 500 | Internal Server Error | Unhandled server errors |
