# Database Models

Both models use Mongoose with the `timestamps: true` option, which automatically manages `createdAt` and `updatedAt` fields.

---

## User Model

**Collection name:** `users`
**File:** `models/user.js`

### Schema Fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `username` | String | yes | — | 3–50 chars, trimmed |
| `email` | String | yes | — | unique, regex-validated, lowercased, trimmed |
| `password` | String | yes | — | min 6 chars, `select: false` (never returned in queries), hashed by pre-save hook |
| `isVerified` | Boolean | no | `false` | Email verification (deferred per PRD) |
| `role` | String | no | `"user"` | Enum: `"admin"`, `"user"` |
| `isActive` | Boolean | no | `true` | Suspended users cannot login or access protected routes |
| `refreshToken` | String | no | `null` | `select: false`, stores current refresh token for rotation validation |
| `profilePicture` | String | no | `null` | S3 URL (deferred per PRD) |
| `simulationCount` | Number | no | `0` | Counter for user's simulations |
| `createdAt` | Date | auto | `Date.now` | Managed by `timestamps: true`, immutable |
| `updatedAt` | Date | auto | `Date.now` | Managed by `timestamps: true`, auto-updated on save |

### Indexes

| Field | Index Type | Reason |
|---|---|---|
| `email` | unique | Prevents duplicate registrations, fast lookup on login |

### Static Methods

#### `User.login(email, password)`

Authenticates a user by email and password.

**Flow:**
1. Find user by email, selecting `+password +isActive`
2. If user not found → throw `"Invalid email or password"`
3. If `isActive === false` → throw `"Account has been suspended"`
4. Compare password with bcrypt hash
5. If mismatch → throw `"Invalid email or password"`
6. Return user document

**Returns:** User document (with password field loaded)

#### `User.register(username, email, password)`

Creates a new user account.

**Flow:**
1. Validate all fields are present
2. Check for existing email → throw `"User already exists"`
3. Validate password length ≤ 12 chars
4. Create user document (triggers pre-save hook for password hashing)

**Returns:** Created user document

### Instance Methods

#### `user.generateJwtToken()`

Generates a short-lived access token.

**Payload:** `{ userId: this._id.toString() }`
**Secret:** `JWT_SECRET`
**Expiry:** 1 hour

**Returns:** JWT string

#### `user.generateRefreshToken()`

Generates a long-lived refresh token with a unique `jti` claim to ensure each token is distinct (prevents identical tokens when issued in the same second).

**Payload:** `{ userId, jti: Date.now() + random }`
**Secret:** `JWT_REFRESH_SECRET`
**Expiry:** 7 days

**Returns:** JWT string

#### `user.saveRefreshToken(token)`

Stores the refresh token on the user document and saves to DB. Used during login and token rotation.

**Returns:** Saved user document

#### `user.clearRefreshToken()`

Sets `refreshToken` to `null` and saves. Used during logout.

**Returns:** Saved user document

### Middleware (Hooks)

#### `pre("save")`

Automatically hashes the password with bcrypt (salt rounds: 10) before saving. Only runs when the password field has been modified.

```js
if (!this.isModified("password")) return;
const salt = await bcrypt.genSalt(10);
this.password = await bcrypt.hash(this.password, salt);
```

---

## Simulation Model

**Collection name:** `simulations`
**File:** `models/simulation.js`

### Schema Fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `userId` | ObjectId | yes | — | Ref: `User`, indexed |
| `simulationData` | Array<Subdoc> | no | `[]` | Results grid, populated by EC2 workers |
| `status` | String | yes | `"pending"` | Enum: `pending`, `completed`, `failed`, `cancelled`. Indexed |
| `functions` | Number[] | yes | — | Integer array, values 1–10 |
| `methods.mutation` | Number[] | yes | — | Integer array, values 1–10 |
| `methods.crossover` | Number[] | yes | — | Integer array, values 1–4 |
| `methods.selection` | Number[] | yes | — | Integer array, values 1–2 |
| `totalModels` | Number | yes | `0` | Computed on create: Cartesian product of all arrays |
| `completedModels` | Number | no | `0` | Updated by workers as models complete |
| `progress` | Number | no | `0` | 0–100 percentage |
| `createdAt` | Date | auto | `Date.now` | Managed by `timestamps: true` |
| `updatedAt` | Date | auto | `Date.now` | Managed by `timestamps: true` |

### simulationData Subdocument Schema

Each element in the `simulationData` array represents one model combination:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `functionId` | Number | yes | — | Benchmark function ID (1–10) |
| `mutationId` | Number | yes | — | Mutation scheme ID (1–10) |
| `crossoverId` | Number | yes | — | Crossover operator ID (1–4) |
| `selectionId` | Number | yes | — | Selection method ID (1–2) |
| `lowestFitness` | Number | no | `null` | Lowest fitness value found by the worker for this combination |

### Indexes

| Field | Index Type | Reason |
|---|---|---|
| `userId` | standard | Fast lookup when listing a user's simulations |
| `status` | standard | Fast filtering by status (admin dashboard, user filtering) |

### Validators

The `isIntegerArray` custom validator ensures all arrays:
- Are not empty (length > 0)
- Contain only integers

```js
const isIntegerArray = (arr) => arr.length > 0 && arr.every(Number.isInteger);
```

### Static Methods

#### `Simulation.createSimulation(userId, functions, methods)`

Creates a new simulation with `totalModels` computed from the Cartesian product.

**Calculation:**
```
totalModels = functions.length × methods.mutation.length × methods.crossover.length × methods.selection.length
```

**Returns:** Created simulation document

#### `Simulation.getSimulation(userId, options)`

Retrieves simulations for a user with optional pagination and status filtering.

**Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `userId` | ObjectId | — | Required: filter by user |
| `options.page` | Number | 1 | Page number (used when limit > 0) |
| `options.limit` | Number | 0 | Items per page (0 = return all) |
| `options.status` | String | — | Filter by status enum |

**Returns:**
- With pagination (`limit > 0`): `{ simulations, simulationCount, currentPage, totalPages }`
- Without pagination: `{ simulations, simulationCount }`

#### `Simulation.getSimulationById(id)`

Retrieves a single simulation by its ObjectId.

**Returns:** Simulation document or `null`

#### `Simulation.deleteSimulation(userId, simulationId)`

Deletes a simulation after verifying ownership.

**Flow:**
1. Find simulation by ID → throw if not found
2. Check `simulation.userId` matches `userId` → throw `"Unauthorized"` if mismatch
3. Delete the document

**Returns:** Deleted simulation's `_id` as string

#### `Simulation.cancelSimulation(userId, simulationId)`

Cancels a simulation by setting `status: "cancelled"` after verifying ownership. Uses `{ new: true }` option. `updatedAt` is auto-managed by `timestamps: true`.

**Returns:** Cancelled simulation's `_id` as string

---

## Entity Relationship

```
User (users collection)
  |
  | 1 : N
  |
  v
Simulation (simulations collection)
  |
  | userId → User._id (ref)
  |
  | simulationData[]
  |   └── { functionId, mutationId, crossoverId, selectionId, lowestFitness }
```

A user can have zero or many simulations. Each simulation belongs to exactly one user. The `userId` field on the Simulation model stores an ObjectId reference to the User model's `_id` field.
