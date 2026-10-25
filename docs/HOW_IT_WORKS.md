# How PCPS Connect works

A plain-language tour of the project, written so the person who runs it can
explain it. For exact endpoints see `API.md`; for running the site day to day
see `ADMIN_GUIDE.md`.

## The big picture

```
Student's browser  ->  Frontend (React, on Vercel)  ->  API (Node + Express, on Render)  ->  MongoDB Atlas
                                                              |-> Cloudinary (images)
                                                              |-> Gmail SMTP (emails)
GitHub Actions (on a timer) -> runs the reminder and digest scripts against the same database
```

- **Frontend** (`frontend/`): the pages students and admins see. Built with
  React and Vite, styled with Tailwind. It never touches the database; it only
  calls the API.
- **Backend** (`backend/`): the rules. Every check that matters (who may do
  what, is the event full, is this input valid) happens here, because anything
  in the browser can be bypassed.
- **Database**: MongoDB, with these collections: users, clubs, events,
  registrations, club memberships, waiting-list entries, the admin audit log
  and the site notice.

## Logging in

1. A student registers with a `@patancollege.edu.np` email (checked on the
   server, not just in the form).
2. The password is stored as a bcrypt hash, never as text.
3. They must **verify their email** (a link valid for 24 hours) and then be
   **approved by an admin** before they can log in.
4. Logging in gives a **JWT** (a signed token) stored in an `httpOnly` cookie,
   so JavaScript on the page can never read it. It lasts 7 days.
5. On every protected request the server reads the cookie, checks the
   signature, loads the user and rejects the token if the account was rejected
   or the password was changed after the token was issued.
6. Because the site and API live on different domains, the cookie is
   `SameSite=None; Secure`. To stop other websites abusing that, every change
   request must carry a custom header (`X-Requested-With`), which only our own
   frontend code can add (CSRF protection, `middleware/csrf.js`).

Password reset links last 15 minutes and work once.

## Roles

`user` (student) and `admin` are stored on the account. **Club leaders** are
students an admin names for a specific club (up to 10 per club); they can
manage only that club's events. These rules are enforced in the API
(`middleware/staff.js`, `utils/clubAccess.js`), so a student can't use leader
or admin features by editing the page.

## Registering for an event

- The server checks the event hasn't happened, the student isn't already
  registered, and there is room. Two people clicking for the last seat at the
  same instant are handled: it counts again after saving and undoes the extra
  registration, so an event is never overbooked.
- If the event is full, the student can join the **waiting list**; when someone
  cancels, the next person is promoted and emailed.
- Events can require **organiser approval**: the registration starts as a
  request and holds a seat until approved.

## QR check-in and certificates

- Each registration has a **check-in code**: the registration's id plus a
  signature made with the server's secret (HMAC). It is shown as a QR code.
- At the door an admin or leader scans it (or types it) on the Check-in page.
  The server verifies the signature and marks the student attended. A forged
  code fails the signature.
- After attending, the student can download a **certificate**. It carries a
  second signed code (a different "purpose", so it can never be used to check
  someone in). Anyone scanning it reaches the public verify page, which only
  confirms it for registrations that were really marked attended.

## Emails

Sent through Gmail with Nodemailer: verification, password reset,
registration confirmations, event changes and cancellations, announcements.
Each has a plain-text version, and messages students can opt out of carry an
Unsubscribe link to Settings. Two GitHub Actions workflows run on a timer:
**daily event reminders** and a **weekly digest** of next week's events from
the student's clubs.

## Protections worth knowing about

- Rate limits on login, registration, password and contact routes, designed
  for a campus where many students share one IP address.
- Input checks on the server for events, clubs, profile fields and passwords,
  with clear 400 messages; bad IDs and broken request bodies are answered
  cleanly instead of crashing.
- Security headers on the website (no framing, no content sniffing, camera
  allowed only for this site so QR scanning works).
- Spreadsheet exports are safe to open in Excel (a name like `=HYPERLINK(...)`
  can't run as a formula).
- An audit log of admin actions, and a tested backup command.
- Deleting an account cancels that person's upcoming events but keeps past
  events as history.

## Where to look in the code

| I want to see... | Look in |
| --- | --- |
| The pages | `frontend/src/pages/` (admin pages in `pages/admin/`) |
| Which pages need login | `frontend/src/routes/` |
| How the frontend talks to the API | `frontend/src/services/api.js` |
| What each API route does | `docs/API.md`, then `backend/routes/` and `backend/controllers/` |
| Login and permissions | `backend/middleware/auth.js`, `staff.js`, `controllers/authController.js` |
| Database shapes | `backend/models/` |
| Event and club validation | `backend/utils/eventInput.js`, `clubInput.js` |
| Emails | `backend/utils/sendEmail.js` and the `notify*` files |
| Scheduled jobs | `.github/workflows/` and `backend/scripts/` |
| Tests | `backend/**/__tests__/`, `frontend/tests/` |

## Questions you may be asked

**Why a cookie instead of storing the token in the browser?** An `httpOnly`
cookie can't be read by page JavaScript, so a script injected into the page
can't steal the login.

**How do you stop someone calling admin routes directly?** Every admin route
checks the role on the server. The hidden buttons in the page are only
convenience.

**What if two people book the last seat?** The server re-counts after saving
and removes the extra registration.

**Can a certificate be faked?** Its code is signed with a secret only the
server has, and the verify page checks it against a real attended registration.

**Why is the first load sometimes slow?** The backend runs on a free tier that
sleeps when idle; the first request wakes it (30-60 seconds). A health-check
monitor keeps it awake.

**What would you improve next?** Sign-in restricted to the college's Google
accounts (needs PCPS IT), loading only upcoming events as the history grows,
and a paid hosting tier with automatic database backups.
