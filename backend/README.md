# PCPS Connect — Backend API Reference

> The always-current list of every endpoint is `docs/API.md` (generated from the code). This file adds request/response details and may lag behind it.

Express + MongoDB API for PCPS Connect. All routes are mounted under
`/api`, and every response is JSON. See the root `README.md` for setup,
environment variables, and the overall project overview.

## Auth model

- Login issues a JWT stored in an **httpOnly cookie** named `token`
  (never read or sent by frontend JS) — see `middleware/auth.js`.
- `protect` middleware requires a valid, non-expired `token` cookie and
  attaches the logged-in user to `req.user`.
- `adminOnly` middleware (always used after `protect`) requires
  `req.user.role === "admin"`.
- Email-verification and password-reset links are also JWTs (signed with
  the same secret, short-lived), but carry a `purpose` claim and are
  submitted as plain request bodies to their own endpoints — `protect`
  explicitly rejects any token carrying a `purpose` claim, so a verify or
  reset link can never be reused as a login session.
- A new account must have `emailVerified: true` **and**
  `approvalStatus: "approved"` before it can log in. Registration is
  restricted to `@patancollege.edu.np` addresses. The approval check also runs on
  every authenticated request, so rejecting a student who is already logged in
  cuts off their existing session immediately.

Below, **Auth** means a valid `token` cookie is required; **Admin** means
`protect` + `adminOnly`.

## Auth — `/api/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | — | `{ name, email, password, studentId?, program?, semester?, phone? }`. Rejects non-PCPS emails and duplicate accounts. Always creates `role: "user"`. Sends a verification email. |
| POST | `/login` | — | `{ email, password }`. Fails with a specific `code` (`EMAIL_NOT_VERIFIED`, `APPROVAL_PENDING`, `APPROVAL_REJECTED`) when login is blocked for one of those reasons. Sets the `token` cookie on success. |
| POST | `/logout` | — | Clears the `token` cookie. |
| GET | `/me` | Auth | Returns the current user — used by the frontend to check "am I logged in" on load. |
| PUT | `/profile` | Auth | `{ name?, studentId?, program?, semester?, phone?, avatar? }` — field-whitelisted and length/type-checked (name ≤80, student ID ≤30, program ≤80, semester/phone ≤20, avatar must be an https link); can't be used to change role/approval/email/password. |
| PUT | `/favorite-club` | Auth | `{ clubId }` — toggles that club as the user's one favorite. |
| PUT | `/change-password` | Auth | `{ currentPassword, newPassword }` — re-verifies the current password first. |
| POST | `/forgot-password` | — | `{ email }` — always returns the same generic message, whether or not the email is registered, to avoid leaking which emails have accounts. Emails a 15-minute reset link if it does. |
| POST | `/reset-password` | — | `{ token, newPassword }` — `token` is the one from the emailed link. |
| POST | `/verify-email` | — | `{ token }` — `token` is the one from the emailed link (24h expiry). Notifies an admin once verified, so they know a new account is waiting for approval. |
| POST | `/resend-verification` | — | `{ email }` — same generic-response pattern as `/forgot-password`. |

## Clubs — `/api/clubs`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | List all clubs. |
| GET | `/:id` | — | One club. |
| POST | `/` | Admin | Create a club. Body: `name, category, description, longDescription?, image?, icon?, activities?, leadName?, leadRole?, email?, foundedYear?`. |
| PUT | `/:id` | Admin | Update a club (same fields, all optional). |
| DELETE | `/:id` | Admin | Deletes the club and cascades: removes its `ClubMembership` rows and clears it from any user's `favoriteClub`. |

## Events — `/api/events`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | List all events, each with a live `registeredCount` computed from actual registrations (not a stored counter). Also `averageRating` (one decimal, `null` if unrated) and `ratingCount` from attendee feedback. |
| GET | `/:id` | — | One event, same `registeredCount` treatment. |
| POST | `/create` | Admin | `multipart/form-data`: `title, description, date, location, capacity?, category?, price?, club?, image?` (file field `image`, uploaded to Cloudinary). `club` is an optional club id; members of that club are emailed on creation (unless they turned club updates off). |
| PUT | `/:id` | Admin | Same fields, all optional; `multipart/form-data` if replacing the image. Capacity can't be set below the number already registered; raising it promotes people from the waitlist. |
| DELETE | `/:id` | Admin | Emails registrants that it's cancelled, then deletes the event and cascades: removes its `Registration` and `WaitlistEntry` rows. |

## Registrations — `/api/registrations`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | Auth | `{ eventId }`. Rejected if the event already happened, the user is already registered, or the event is full. Capacity is enforced with a check-then-recheck-and-rollback pattern so two simultaneous requests for the last spot can't both succeed. |
| GET | `/my` | Auth | The current user's own registrations, each with its event populated. |
| GET | `/:id/certificate` | Auth | Certificate details (student, event, club) plus a signed verification `code`. Owner only, and only once the student is marked attended. |
| GET | `/:id/check-in-code` | Auth | `{ code }` for the QR the student shows at the door. Owner only. The code is an HMAC of the registration id, so nothing is stored. |
| PUT | `/:id/feedback` | Auth | `{ rating: 1-5, feedback?: string ≤500 }`. Only the owner, and only once an admin has marked them as attended. Overwrites any earlier feedback. |
| DELETE | `/:id` | Auth | `:id` is the **registration's** own id (not the event id) — cancels it. 403s if it doesn't belong to the current user. | Past events can't be cancelled. |

## Waitlist — `/api/waitlist`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/:eventId` | Auth | `{ onWaitlist, position? }` for the current user. |
| POST | `/:eventId` | Auth | Join the waitlist. Only allowed for a full, upcoming event the user isn't already registered for. |
| DELETE | `/:eventId` | Auth | Leave the waitlist. |

When a seat opens (a registration is cancelled, or capacity is raised) the longest-waiting student is registered automatically and emailed.

## Certificates — `/api/certificates`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/verify/:code` | — | Public. `200 { valid: true, student: { name }, event: { title, date } }` for a genuine certificate; `404 { valid: false }` for a forged code or one whose attendance wasn't recorded. Check-in codes are signed under a different purpose and are rejected here. |

## Club memberships — `/api/club-memberships`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/my` | Auth | The current user's club memberships, each with its club populated. |
| POST | `/join` | Auth | `{ clubId }`. |
| DELETE | `/:clubId` | Auth | Leaves that club. |

## Admin — `/api/admin` (every route below requires Admin)

| Method | Path | Notes |
|---|---|---|
| GET | `/users` | List every user. |
| GET | `/users/:id` | One user. |
| GET | `/users/:id/events` | Events created by that user (events are always admin-created, so in practice this lists another admin's events). |
| PUT | `/users/:id` | Update any field except `password` (silently stripped). An admin can't change their own `role`/`approvalStatus`, and the last remaining admin can't be demoted — both enforced here, not just in the UI. |
| DELETE | `/users/:id` | Deletes the user and cascades: their created events, their registrations, their club memberships. Same self-action and last-admin protections as above. |
| GET | `/events` | List every event (admin view). |
| GET | `/events/:id` | One event (admin view). |
| PUT | `/events/:id` | Update any event. |
| DELETE | `/events/:id` | Delete any event. |
| GET | `/events/:id/registrations` | Full attendee list for that event, each registration populated with its user — this is what powers the attendee modal and the CSV export. Also returns `waitlist`: the students queued for the event, oldest first (the order they are promoted in). |
| PUT | `/registrations/:id` | `{ attended }` — toggles attendance for one registration. |
| POST | `/check-in` | `{ code }` — verifies a scanned check-in code and marks that registration attended. Idempotent (`alreadyCheckedIn`). Not rate-limited, since one admin phone scans many students. |
| POST | `/events/:id/announce` | `{ message }` (1-1000 chars) — emails everyone registered for the event; returns `{ sent }`. Recorded in the activity log. |
| POST | `/clubs/:id/announce` | `{ message }` (1-1000 chars) — emails everyone who joined the club, except those who turned off club updates; returns `{ sent }`. Recorded in the activity log. |
| GET | `/audit` | The 200 most recent admin actions (role changes, approvals/rejections, deletions), newest first. Entries expire after a year. |
| GET | `/attendance-report` | Turnout for the 8 most recent past events: registered, attended, no-shows, attendance %, average rating, plus overall totals. |

## Contact — `/api/contact`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/` | — | `{ name, email, subject?, message }`. Rate-limited (public form). Emails the submission to `CONTACT_RECEIVER_EMAIL` (or `EMAIL_USER` if unset) with `replyTo` set to the submitter's address. All fields are HTML-escaped before being placed in the email body. |

## Stats — `/api/stats`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | — | `{ totalStudents, totalClubs, totalEvents, totalRegistrations }` — aggregate counts only, safe to expose publicly. Powers the homepage stats section. |

## Data models

Full field definitions live in `models/*.js`; summary:

- **User** — `name, email (unique), password (hashed, select:false), role (user|admin), studentId, program, semester, phone, avatar, favoriteClub (→Club), emailVerified, approvalStatus (pending|approved|rejected)`
- **Club** — `name, category, description, longDescription, image, icon, activities[], leadName, leadRole, email, foundedYear, createdBy (→User)`
- **Event** — `title, description, date, location, image, capacity, category, price, club? (→Club), createdBy (→User)`
- **Registration** — `user (→User), event (→Event), status (pending|confirmed|cancelled), attended, reminderSent, rating?, feedback?`. Unique index on `(user, event)`.
- **WaitlistEntry** — `user (→User), event (→Event)`. Unique index on `(user, event)`; oldest entry is promoted first.
- **AuditLog** — `actor (→User), actorName, action, summary`. Expires after a year.
- **ClubMembership** — `user (→User), club (→Club)`. Unique index on `(user, club)`.

## Error responses

Every endpoint returns `{ message: "..." }` on failure. In production
(`NODE_ENV=production`), unexpected/internal error messages are replaced
with a generic fallback before being sent to the client (the real error is
still logged server-side) — see `utils/errorMessage.js`. Validation and
permission errors (400/401/403/404) always return their specific,
intentional message.
