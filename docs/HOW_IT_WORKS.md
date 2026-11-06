# How PCPS Connect works

A plain-language tour of the project, written so the person who runs it can
explain it. For exact endpoints see `API.md`; for running the site day to day
see `ADMIN_GUIDE.md`.

## The big picture

```
Student's browser  ->  Frontend (React, on Vercel)  ->  API (Node + Express, on Render)  ->  MongoDB Atlas
                                                              |-> Cloudinary (images)
                                                              |-> Brevo (emails; Gmail SMTP as fallback)
GitHub Actions (on a timer) -> runs the reminder and digest scripts against the same database
```

- **Frontend** (`frontend/`): the pages students and admins see. Built with
  React and Vite, styled with Tailwind. It never touches the database; it only
  calls the API.
- **Backend** (`backend/`): the rules. Every check that matters (who may do
  what, is the event full, is this input valid) happens here, because anything
  in the browser can be bypassed.
- **Database**: MongoDB, with these collections: users, clubs, events,
  registrations, club memberships, club join requests, waiting-list entries, in-app notifications
  (the bell), contact messages, the admin audit log and the site notice.

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
- An event can have a **registration deadline**. After it, nobody new can
  register or join the waiting list (`utils/registrationDeadline.js`); people
  already registered keep their place.
- An organiser can add a **walk-in**: a student who turned up without
  registering is looked up by exact email or student ID and is registered and
  checked in at once (`controllers/walkInController.js`). Capacity still applies.

## Time zones

The server runs in UTC, so times are handled as exact instants. The admin form
converts the organiser's local time to UTC before sending it
(`frontend/src/utils/dateTimeInput.js`), pages show times in each viewer's own
zone, and emails write them in Nepal time (`backend/utils/formatEventDate.js`;
`EVENT_TIMEZONE` changes the zone). Calendar files use UTC stamps, which every
calendar app converts correctly.

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

Sent through Brevo (or Gmail SMTP with Nodemailer as a fallback): verification, password reset,
registration confirmations, event changes and cancellations, announcements.
Each has a plain-text version, and messages students can opt out of carry an
Unsubscribe link to Settings. Three GitHub Actions workflows run on a timer:
**daily event reminders**, a **weekly digest** of next week's events from
the student's clubs, and **join request reminders** that nudge club leaders
about students who have waited more than 5 days.

## Nepali language

The "नेपाली / English" switch in the top bar changes the whole interface. There is no
translation service: `frontend/src/i18n/ne.js` is one big dictionary where the English
sentence is the key and the Nepali sentence is the value. Pages call `t("English text")`
(from `useLang()`), and if a sentence has no Nepali entry the English shows, so nothing
is ever blank. Dates use Nepali month and weekday names, bell notifications and server
error messages are matched against known sentence shapes and translated in the browser, and
the dictionary is only downloaded when Nepali is used. A test fails if a translated page
uses text that is missing from the dictionary. Each account keeps a saved language (`language` on the user, "en" or "ne"), updated
whenever the student switches language while logged in; the account emails (verify, password
reset, password changed, account deleted) are written in it, with wording in
`backend/utils/emailText.js`. The event emails (registration confirmed, request received or
declined, waitlist spot, event changed or cancelled, organiser message) use the same language,
with wording in `backend/utils/eventEmailText.js` and Nepali dates from `formatEventDate`.
Still English: the club and reminder emails, the printed certificate, and the Terms of Use and Privacy Policy pages.

## Protections worth knowing about

- Rate limits on login, registration, password and contact routes, designed
  for a campus where many students share one IP address. The Contact form has
  its own counter (so spam there cannot block password resets), and joining or
  leaving clubs and other actions are limited per logged-in student.
- The Contact form has a hidden "trap" field that real people never see; a
  submission that fills it in is quietly dropped. Genuine messages are saved
  for 180 days and shown to admins under Admin → Messages.
- Event photos (up to 8 per event, added by admins and the event's club
  leaders) are shrunk in the browser, stored on Cloudinary, and deleted from
  Cloudinary when a photo is removed or the event is deleted. The server only
  ever deletes files in its own event-photos folder.
- "Download my data" lists everything stored about a student, and deleting an
  account removes it, including their questions and Contact messages.
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
| Nepali text and the language switch | `frontend/src/i18n/ne.js`, `context/LanguageContext.jsx`, `tests/i18n.test.js` |
| Event questions, club news, club members | `controllers/eventQuestionController.js`, `clubPostController.js`, `clubMembersController.js` |
| Offline tickets and install | `frontend/src/services/ticketSync.js`, `public/sw.js`, `utils/installApp.js` |
| Scheduled jobs | `.github/workflows/` and `backend/scripts/` |
| Tests | `backend/**/__tests__/`, `frontend/tests/` |

## Questions may be asked

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
