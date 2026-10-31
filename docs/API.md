# PCPS Connect API reference

Generated from the route files by `npm run docs:api` (in `backend/`) -- do not edit by hand.
Every state-changing request (POST/PUT/PATCH/DELETE) must send the header `X-Requested-With: XMLHttpRequest` (a CSRF defence); the frontend does this automatically.
Logged-in access uses an httpOnly cookie set by `POST /api/auth/login`.

Access levels: **Anyone**, **Logged-in student**, **Admin or club leader** (leaders only for their own clubs' events), **Admin only**.
76 endpoints.

## /api/health

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/health` | Anyone | Uptime check: 200 when the database is connected, 503 otherwise; also names the email method set up (brevo, gmail-smtp or not-configured). |

## /api/auth

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/auth/register` | Anyone (rate limited) | Create a student account (PCPS email addresses only); sends a verification email. |
| POST | `/api/auth/login` | Anyone (rate limited) | Log in; sets the session cookie. |
| POST | `/api/auth/logout` | Anyone | Log out; clears the session cookie. |
| GET | `/api/auth/me` | Logged-in student | The logged-in user's own account. |
| PUT | `/api/auth/profile` | Logged-in student | Edit your own profile (name, student ID, program, semester, phone, email preferences). |
| PUT | `/api/auth/favorite-club` | Logged-in student | Set or clear your one favourite club. |
| PUT | `/api/auth/change-password` | Logged-in student (rate limited) | Change your own password (needs the current one). |
| GET | `/api/auth/export` | Logged-in student (rate limited) | Download everything the site stores about you, as JSON. |
| DELETE | `/api/auth/account` | Logged-in student (rate limited) | Delete your own account and everything attached to it (needs your password). |
| POST | `/api/auth/forgot-password` | Anyone (rate limited) | Email a password-reset link; the reply is the same whether or not the address exists. |
| POST | `/api/auth/reset-password` | Anyone (rate limited) | Set a new password using a reset-link token. |
| POST | `/api/auth/verify-email` | Anyone (rate limited) | Confirm an email address using a verification-link token. |
| POST | `/api/auth/resend-verification` | Anyone (rate limited) | Send the verification email again. |

## /api/events

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/events` | Anyone | List all events, with how many are registered. |
| GET | `/api/events/calendar.ics` | Anyone | Public calendar feed (.ics) of upcoming events, optionally ?club=<id>, for subscribing in Google, Apple or Outlook Calendar. |
| GET | `/api/events/:id` | Anyone (logged-in users see more) | One event; the organiser's email is shown only to logged-in users. |
| GET | `/api/events/:id/questions` | Anyone (logged-in users see more) | The public questions and answers on an event (newest first, up to 50). Only first names are shown. |
| POST | `/api/events/:id/questions` | Logged-in student (rate limited) | Ask a public question on an upcoming event (max 3 unanswered per student); the organiser is emailed. |
| PUT | `/api/events/:id/questions/:questionId/answer` | Admin or club leader (rate limited) | Answer a question on an event (admins and that event's club leaders only); the asker is emailed the first time. |
| DELETE | `/api/events/:id/questions/:questionId` | Logged-in student (rate limited) | Delete a question: its asker, or an admin / the event's club leader. |
| POST | `/api/events/create` | Admin or club leader (rate limited; image upload) | Create an event (admins, or a leader for their own club), with an optional image. Send repeat (weekly or biweekly) and repeatCount (2 to 12) to create a series of separate events. An optional endDate (after the start, at most 7 days long) sets when it ends. |
| PUT | `/api/events/:id` | Admin or club leader (image upload) | Edit an event; registered students are emailed if the date or place changes. |
| DELETE | `/api/events/:id` | Admin or club leader | Delete an event; registered students are emailed the cancellation. |

## /api/registrations

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/registrations/register` | Logged-in student (rate limited) | Register for an event (or request to join, if the event needs approval). |
| GET | `/api/registrations/my` | Logged-in student | Your own registrations. |
| GET | `/api/registrations/:id/check-in-code` | Logged-in student | The signed code shown as a QR at the door (your own registration only). |
| GET | `/api/registrations/:id/certificate` | Logged-in student | Your attendance certificate (only if you were marked as attended). |
| PUT | `/api/registrations/:id/feedback` | Logged-in student (rate limited) | Rate an event 1-5 with an optional comment (only if you attended). |
| DELETE | `/api/registrations/:id` | Logged-in student (rate limited) | Cancel your own registration; the next person on the waitlist is promoted. |

## /api/admin

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/admin/events/:id/registrations` | Admin or club leader | Everyone registered for an event, plus its waitlist. |
| POST | `/api/admin/events/:id/announce` | Admin or club leader (rate limited) | Email everyone registered for an event. |
| GET | `/api/admin/clubs/:id/members` | Admin or club leader | List who joined a club (name, email, student ID, join date), newest first; admins and that club's leaders only. |
| POST | `/api/admin/clubs/:id/announce` | Admin or club leader (rate limited) | Email everyone who joined a club (members who opted out are skipped). |
| POST | `/api/admin/events/:id/walk-in` | Admin or club leader (rate limited) | Add a student who turned up without registering (by exact email or student ID) as registered and attended; admins and that event's club leaders only. |
| PUT | `/api/admin/registrations/:id` | Admin or club leader | Mark a registration as attended or not. |
| PUT | `/api/admin/registrations/:id/decision` | Admin or club leader | Approve or decline a join request for an approval-only event. |
| GET | `/api/admin/attendance-report` | Admin or club leader | Turnout and ratings for recent past events (add ?all=1 for every past event, up to 500). |
| POST | `/api/admin/check-in` | Admin or club leader | Check a student in by scanning or typing their registration code. |
| GET | `/api/admin/insights` | Admin only | Registrations per month, most popular clubs and overall turnout. |
| GET | `/api/admin/week` | Admin only | New students and registrations in the last 7 days versus the week before, plus events in the next 7 days. |
| GET | `/api/admin/users` | Admin only | All accounts. |
| GET | `/api/admin/users/:id` | Admin only | One account. |
| GET | `/api/admin/users/:id/events` | Admin only | The events that one account has created. |
| PUT | `/api/admin/users/bulk-approve` | Admin only | Approve a chosen batch (up to 200) of pending accounts at once. |
| PUT | `/api/admin/users/:id/verify-email` | Admin only | Mark a student's email as verified by hand (for when the verification email never arrived); recorded in the activity log. Does not approve the account. |
| PUT | `/api/admin/users/:id` | Admin only | Change an account's role or approval status. |
| DELETE | `/api/admin/users/:id` | Admin only | Delete an account and what is attached to it. |
| GET | `/api/admin/events` | Admin only | All events, for the admin panel. |
| GET | `/api/admin/events/:id` | Admin only | One event, for the admin panel. |
| PUT | `/api/admin/events/:id` | Admin only | Edit any event; registered students are emailed if the date or place changes. |
| DELETE | `/api/admin/events/:id` | Admin only | Delete any event; registered students are emailed the cancellation. |
| GET | `/api/admin/clubs/:id/leaders` | Admin only | The students named as leaders of a club. |
| PUT | `/api/admin/clubs/:id/leaders` | Admin only | Set a club's leaders (up to 10); new leaders are emailed. |
| GET | `/api/admin/audit` | Admin only | The activity log of admin actions (kept for a year). |
| PUT | `/api/admin/notice` | Admin only | Publish or clear the site-wide announcement banner. |

## /api/clubs

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/clubs` | Anyone | List all clubs, with member counts. |
| GET | `/api/clubs/:id` | Anyone | One club, with its member count. |
| GET | `/api/clubs/:id/posts` | Anyone | A club's latest news posts (newest first, up to 20). |
| POST | `/api/clubs/:id/posts` | Logged-in student (rate limited) | Post a short news update on a club (admins and that club's leaders only). |
| DELETE | `/api/clubs/:id/posts/:postId` | Logged-in student (rate limited) | Delete one news post (admins and that club's leaders only). |
| POST | `/api/clubs` | Admin only | Create a club. |
| PUT | `/api/clubs/:id` | Admin only | Edit a club. |
| DELETE | `/api/clubs/:id` | Admin only | Delete a club along with its memberships and event links. |

## /api/club-memberships

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/club-memberships/my` | Logged-in student | The clubs you have joined. |
| POST | `/api/club-memberships/join` | Logged-in student | Join a club. |
| DELETE | `/api/club-memberships/:clubId` | Logged-in student | Leave a club. |

## /api/contact

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/contact` | Anyone (rate limited) | Send a message to the PCPS Connect team by email. |

## /api/stats

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/stats` | Anyone | Totals shown on the home page (students, clubs, events, registrations). |

## /api/notice

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/notice` | Anyone | The current site-wide announcement, if any. |

## /api/leader

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/leader/clubs` | Logged-in student | The clubs you are a leader of. |

## /api/waitlist

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/waitlist/my` | Logged-in student | The upcoming events you are waitlisted for, with your place in line. |
| GET | `/api/waitlist/:eventId` | Logged-in student | Whether you are on an event's waitlist, and where. |
| POST | `/api/waitlist/:eventId` | Logged-in student (rate limited) | Join the waitlist of a full event. |
| DELETE | `/api/waitlist/:eventId` | Logged-in student (rate limited) | Leave an event's waitlist. |

## /api/certificates

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/certificates/verify/:code` | Anyone (rate limited) | Check that a certificate code is genuine (public, no login). |
