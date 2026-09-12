# PCPS Connect — Backend API

Express + MongoDB backend for the PCPS Connect Club & Event Management System.

**Live API:** https://pcps-connect-backend.onrender.com

## Tech stack

- Node.js + Express
- MongoDB + Mongoose
- JWT auth via an `httpOnly` cookie (not localStorage, not a Bearer header)
- bcryptjs for password hashing
- Cloudinary for event/club image storage (not local disk — most hosting
  platforms wipe local files on every redeploy)
- Nodemailer (Gmail SMTP) for verification, password reset, and contact emails
- express-rate-limit + helmet for basic security hardening

## Folder structure

```
backend/
 ├── config/          MongoDB and Cloudinary connections
 ├── models/          User, Event, Club, Registration, ClubMembership schemas
 ├── middleware/
 │    ├── auth.js         protect (require login), adminOnly (require admin role)
 │    ├── upload.js       Multer (memory storage) + Cloudinary upload helper
 │    └── rateLimit.js    Login/register/contact rate limiting
 ├── controllers/     Route handler logic, grouped by resource
 ├── routes/          Express routers, grouped by resource
 ├── utils/           sendEmail.js — Nodemailer wrapper
 ├── scripts/         One-off maintenance scripts (see below)
 ├── seed.js          Populates sample clubs and events
 └── index.js         App entry point
```

## Setup

### 1. MongoDB Atlas

Create a free cluster at mongodb.com/atlas. Under Network Access, allow
`0.0.0.0/0` (needed since most hosting platforms don't have a fixed IP).

### 2. Cloudinary

Free account at cloudinary.com. Your Cloud Name, API Key, and API Secret
are on your dashboard immediately after signing up.

### 3. Gmail App Password (for sending email)

Turn on 2-Step Verification on the Gmail account you want to send from,
then generate an App Password at myaccount.google.com/apppasswords. This
is a 16-character code — NOT your normal Gmail password.

### 4. Environment variables

```bash
cp .env.example .env
```
Fill in `MONGO_URI`, `JWT_SECRET` (any long random string), Cloudinary
credentials, and email credentials.

### 5. Install and run

```bash
npm install
npm run dev
```

### First-time data setup

```bash
npm run seed       # populates 5 sample clubs and 5 sample events
npm run backfill   # marks any existing accounts as verified + approved
                    # (only needed once, after adding the verification/
                    # approval system to a database that already had users)
```

## API reference

All routes are prefixed with `/api`.

### Auth — `/api/auth`

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/register` | — | Requires a `@patancollege.edu.np` email. Account starts unverified + pending approval. |
| POST | `/login` | — | Blocked until `emailVerified` and `approvalStatus === "approved"`. Returns a `code` (`EMAIL_NOT_VERIFIED` / `APPROVAL_PENDING` / `APPROVAL_REJECTED`) on failure so the frontend can react appropriately. |
| POST | `/logout` | — | Clears the auth cookie |
| GET | `/me` | login | Check "am I still logged in" on page refresh |
| PUT | `/profile` | login | Update your own name/studentId/program/semester/phone/avatar |
| PUT | `/favorite-club` | login | Toggle your one favorite club (independent of club membership) |
| POST | `/forgot-password` | — | Always returns the same generic message, whether or not the email is registered |
| POST | `/reset-password` | — | `{ token, newPassword }` — token is a 15-minute JWT emailed by forgot-password |
| POST | `/verify-email` | — | `{ token }` — token is a 24-hour JWT emailed on registration |
| POST | `/resend-verification` | — | `{ email }` — same generic-response pattern as forgot-password |

### Events — `/api/events`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | Includes a live `registeredCount` per event, computed from actual registrations (not a stored counter) |
| GET | `/:id` | — | |
| POST | `/create` | login | `multipart/form-data`, image field name is `image` |
| PUT | `/:id` | login + owner/admin | |
| DELETE | `/:id` | login + owner/admin | Cascades: also deletes that event's registrations |

### Clubs — `/api/clubs`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | |
| GET | `/:id` | — | |
| POST | `/` | login + admin | |
| PUT | `/:id` | login + admin | |
| DELETE | `/:id` | login + admin | Cascades: also removes memberships and clears any student's favorite pointing at it |

### Club memberships — `/api/club-memberships`

| Method | Route | Auth | Notes |
|---|---|---|---|
| GET | `/my` | login | Your joined clubs, each populated with full club info |
| POST | `/join` | login | `{ clubId }` |
| DELETE | `/:clubId` | login | Leave a club |

### Registrations — `/api/registrations`

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/register` | login | `{ eventId }` — rejects if the event is full |
| GET | `/my` | login | |
| DELETE | `/:id` | login + owner | Unregister from an event |

### Contact — `/api/contact`

| Method | Route | Auth | Notes |
|---|---|---|---|
| POST | `/` | — (rate-limited) | `{ name, email, subject, message }` — emails the submission to `CONTACT_RECEIVER_EMAIL`, with `replyTo` set to the submitter |

### Admin — `/api/admin` (all routes require login + `role === "admin"`)

| Method | Route | Notes |
|---|---|---|
| GET | `/users` | |
| GET | `/users/:id` | |
| GET | `/users/:id/events` | Events created by that user |
| PUT | `/users/:id` | Update any field except password — used for role changes and approving/rejecting accounts (`{ role: "admin" }` or `{ approvalStatus: "approved" }`) |
| DELETE | `/users/:id` | Cascades: also deletes their events, registrations, and club memberships |
| GET | `/events` | |
| GET | `/events/:id` | |
| PUT | `/events/:id` | No ownership check — admin can edit any event |
| DELETE | `/events/:id` | Cascades: also deletes that event's registrations |
| GET | `/events/:id/registrations` | Everyone registered for an event, for the attendance UI |
| PUT | `/registrations/:id` | `{ attended: true/false }` — mark a single registration's attendance |

## Registration and login flow

New accounts go through two gates before they can log in:

1. **Email verification** — registering sends a 24-hour link to the
   student's email. A made-up address can never be verified, since
   nobody can click a link they never received.
2. **Admin approval** — even after verifying, the account stays
   `"pending"` until an admin approves it from the admin dashboard. This
   is a human checkpoint on top of the automated one.

Login returns a specific error `code` for each blocked state, so the
frontend can show the right message (and, for `EMAIL_NOT_VERIFIED`, offer
to resend the verification email).

## Maintenance scripts

- `npm run seed` — populates sample clubs and events. Safe to re-run
  (clears existing clubs/events first).
- `npm run backfill` — marks all existing users as verified + approved.
  Only needed once, the first time this backend is deployed against a
  database that already has users from before the verification/approval
  system existed. Without it, every pre-existing account (including the
  admin's own) would be locked out.

## Error response format

```json
{ "message": "Human-readable error description" }
```
Some auth errors also include a `code` field for programmatic handling
(see the Auth table above). Common status codes: `400` (bad input), `401`
(not logged in), `403` (logged in but not allowed), `404` (not found),
`500` (server error).

## Data models

**User**
```
{ _id, name, email, password (hashed, never sent to frontend), role: "user" | "admin",
  studentId, program, semester, phone, avatar, favoriteClub (Club ref),
  emailVerified: Boolean, approvalStatus: "pending" | "approved" | "rejected",
  createdAt, updatedAt }
```

**Event**
```
{ _id, title, description, date, location, image (Cloudinary URL),
  capacity, category, price, createdBy (User ref), createdAt, updatedAt }
```

**Club**
```
{ _id, name, category, description, longDescription, image, icon,
  activities, leadName, leadRole, email, foundedYear, createdBy (User ref) }
```

**Registration**
```
{ _id, user (User ref), event (Event ref), status, attended: Boolean,
  createdAt, updatedAt }
```

**ClubMembership**
```
{ _id, user (User ref), club (Club ref), createdAt, updatedAt }
```

## Creating your first admin user

There's no public "become admin" endpoint (that would be a security
hole). Register normally, then either:
- Include `"role": "admin"` in the registration request body (useful in
  development), or
- Manually change that user's `role` field to `"admin"` directly in
  MongoDB (Atlas web UI → Browse Collections, or MongoDB Compass)

You'll also need to manually set `emailVerified: true` and
`approvalStatus: "approved"` for that first admin account, since there's
no other admin yet to approve them.
