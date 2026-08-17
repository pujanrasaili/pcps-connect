# PCPS Connect — Backend API

Express + MongoDB backend for the PCPS Connect Club & Event Management System.
Matches the API contract shared with the frontend team, plus a few small,
necessary additions noted below.

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth via an `httpOnly` cookie (not localStorage, not a Bearer header)
- bcryptjs for password hashing
- Multer for event image uploads

## Folder structure

```
backend/
 ├── config/db.js            MongoDB connection
 ├── models/                 User, Event, Registration schemas
 ├── middleware/
 │    ├── auth.js            protect (require login), adminOnly (require admin role)
 │    └── upload.js          Multer config for event image uploads
 ├── controllers/            Route handler logic, grouped by resource
 ├── routes/                 Express routers, grouped by resource
 ├── uploads/                Uploaded event images land here, served at /uploads/<file>
 ├── index.js                App entry point
 └── .env.example            Copy to .env and fill in real values
```

## Setup

### 1. Install MongoDB

Pick one:
- **Local install**: install MongoDB Community Server, make sure the `mongod` service is running. Default connection string: `mongodb://127.0.0.1:27017/pcps-connect`
- **MongoDB Atlas** (free cloud tier, no local install needed): create a free cluster at mongodb.com/atlas, get your connection string from the "Connect" button, replace `<password>` with your database user's password.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:
- `MONGO_URI` — your local or Atlas connection string
- `JWT_SECRET` — any long random string (used to sign login tokens)
- `CLIENT_ORIGIN` — the exact URL your frontend runs on (Vite's default is `http://localhost:5173`)

### 3. Install dependencies and run

```bash
npm install
npm run dev      # auto-restarts on file changes (nodemon)
# or
npm start        # plain node, no auto-restart
```

You should see:
```
MongoDB connected: <host>
PCPS Connect API listening on http://localhost:5000
```

### If you see `querySrv ECONNREFUSED`

Some networks (certain routers, ISPs, campus wifi, VPNs, some antivirus
software) block the DNS lookup that `mongodb+srv://` connection strings
rely on. `config/db.js` already works around this by pointing Node's DNS
resolver at Google DNS (`8.8.8.8`) before connecting — no extra setup
needed, this should just work even on networks that block the default
lookup.

## API summary

All endpoints are prefixed with `/api`.

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | — | Accepts optional `studentId`, `program`, `semester`, `phone` |
| POST | `/auth/login` | — | Sets the `token` cookie |
| POST | `/auth/logout` | — | Clears the cookie |
| GET | `/auth/me` | login | Check "am I still logged in" on page refresh |
| PUT | `/auth/profile` | login | Update your own name/studentId/program/semester/phone/avatar |
| GET | `/events` | — | |
| GET | `/events/:id` | — | |
| POST | `/events/create` | login | `multipart/form-data`, image field name is `image` |
| PUT | `/events/:id` | login + owner/admin | |
| DELETE | `/events/:id` | login + owner/admin | |
| POST | `/registrations/register` | login | |
| GET | `/registrations/my` | login | |
| DELETE | `/registrations/:id` | login + owner | Unregister from an event |
| GET | `/clubs` | — | |
| GET | `/clubs/:id` | — | |
| POST | `/clubs` | login + admin | |
| PUT | `/clubs/:id` | login + admin | |
| DELETE | `/clubs/:id` | login + admin | |
| GET | `/club-memberships/my` | login | Your joined clubs, each populated with club info |
| POST | `/club-memberships/join` | login | `{ clubId }` |
| DELETE | `/club-memberships/:clubId` | login | Leave a club |
| PUT | `/club-memberships/:clubId/favorite` | login | Toggle favorite (auto-joins if needed, clears any previous favorite) |
| GET/PUT/DELETE | `/admin/users...` | login + admin | |
| GET/PUT/DELETE | `/admin/events...` | login + admin | |

### Additions spec

1. **`POST /api/auth/logout`** and **`GET /api/auth/me`** — needed for a real login/logout flow with an httpOnly cookie, since JavaScript can't read that cookie directly.
2. **`PUT /api/auth/profile`** — lets a student fill in studentId/program/phone/etc. after registering, rather than requiring all of it upfront.
3. **`DELETE /api/registrations/:id`** — lets a student unregister from an event.
4. **The entire Club + ClubMembership system** — the original spec only covered Events. Clubs are now a real, database-backed resource with the same public-read/admin-write pattern as Events, and each student's join/favorite state is tracked server-side per user instead of in the browser's localStorage.

## Seeding sample data

The original 5 PCPS clubs and 5 sample events used to live only in the
frontend's hardcoded data files. Now they live in the database instead:

```bash
# 1. Register at least one user first (via the frontend, or curl/Postman)
#    -- events need a "createdBy" user, so seeding events is skipped if
#    none exists yet.

# 2. Then run:
npm run seed
```

Safe to re-run — it clears existing clubs/events before reinserting, so you
won't get duplicates.

## Testing without a frontend

Use Postman, Insomnia, or `curl` with a cookie jar:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","email":"test@pcps.edu.np","password":"password123"}'

# Login (saves the cookie to cookies.txt)
curl -c cookies.txt -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@pcps.edu.np","password":"password123"}'

# Use the saved cookie on a protected route
curl -b cookies.txt http://localhost:5000/api/auth/me
```

## Creating your first admin user

There's no public "become admin" endpoint (by design — that would be a
security hole). To create one, either:
- Register normally with `"role": "admin"` in the request body during
  development, or
- Register normally, then manually update that user's `role` field to
  `"admin"` directly in MongoDB (MongoDB Compass, or the Atlas web UI's
  "Browse Collections").
