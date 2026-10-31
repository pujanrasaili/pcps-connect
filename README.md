# PCPS Connect — Club & Event Management System

A full MERN stack web application built for Patan College of Professional
Studies (PCPS), letting students explore clubs, discover events, register
in a few clicks, and track their participation from a personal dashboard —
with a full admin panel for staff to manage clubs, events, and student
accounts.

**Live app:** https://pcps-connect.vercel.app
**API:** https://pcps-connect-backend.onrender.com

> The backend runs on a free hosting tier, so the very first request after
> a period of inactivity can take 30-60 seconds to wake up — this is
> expected, not a bug.

## Tech Stack

**Frontend:** React 19, Vite, React Router, Tailwind CSS, Axios, Recharts, React Icons
**Backend:** Node.js, Express, MongoDB (Mongoose), JWT authentication (httpOnly cookies), bcrypt
**Infrastructure:** MongoDB Atlas (database), Cloudinary (image storage), Gmail SMTP via Nodemailer (transactional email), Vercel (frontend hosting), Render (backend hosting)

## Project Structure

```
pcps-connect/
├── frontend/   React + Vite + Tailwind client
└── backend/    Express + MongoDB API server
```

## Features

### For students
- Account registration restricted to real PCPS email addresses (@patancollege.edu.np)
- After signing up, a full-page confirmation says the account was created, names the address the verification link went to, lists the next steps and offers "send again"; if the email could not be sent it says so
- Email verification + admin approval required before an account can log in
- JWT-based authentication with httpOnly cookies (secure against XSS token theft)
- Real password reset via email, plus in-app change password from Settings; every password box has a show/hide button and the right autocomplete hints so password managers can fill and generate passwords
- Site-wide search: press "/" or use the magnifying glass in the top bar to find clubs and events by name, topic, place or hosting club from any page; best name matches first, upcoming events before past ones
- Full club directory: browse, search, filter by category, join/leave, favorite, and an "Only clubs I've joined" filter (shareable as `?mine=1`), plus sorting by most members or name (`?sort=members`)
- Full event directory: browse, search (by name, place or club), filter, register/unregister, live capacity tracking, and a "View events" link from each club that shows only its events
- "This week" tab on the Events page: only events starting in the next 7 days (today counts as day one); shareable as `?when=week`
- Club events: an event can be hosted by a club, and members of that club are emailed when it is announced (opt out in Settings)
- Weekly digest: every Sunday morning each student gets one email listing the next 7 days of events from the clubs they joined (skipping events they already registered for or that are full; nobody gets an empty digest). Runs from a GitHub Actions schedule, can be previewed with a dry run, and the "Club updates" switch in Settings turns it off
- Events can require organiser approval ("Approve each person who joins" when creating an event): students send a request instead of being confirmed, a seat is held for them, and the organiser approves or declines from the attendee list; the student is emailed either way and only approved students get the QR code, calendar links and reminders
- Admins can email a message to all members of a club from Admin → Clubs (members who turned off club updates are skipped)
- Site announcement: admins publish (or remove) a short banner shown at the top of every page from Admin → Overview ("Information" or "Important" style); visitors can close it, and an edited announcement shows again. Changes are written to the activity log
- Admins can approve every pending sign-up at once ("Approve all" on the Pending filter, respects search) — each person is emailed and it's logged as one activity entry
- Admin → Users can be filtered by approval status (pending / approved / rejected, with counts) and searched by student ID
- Admins can mark a student's email as verified by hand ("Mark verified" on an Unverified row, after a confirmation, recorded in the activity log) when the verification email never arrived; it does not approve the account
- Admin → Users can export the current (filtered) list of students as an Excel-safe CSV
- "Share this event" button on every event page (phone share sheet, or copies the link on desktop)
- Installable on phones: "Add to home screen" gives a PCPS Connect app icon that opens full-screen (no offline caching, so data is never stale)
- Admins can see who is on an event's waitlist, in promotion order, in the Attendees window
- The Attendees window has a quick search (name, email, student ID) and a "Not yet attended" filter for marking people at the door
- Post-event feedback: students marked as attended can rate the event 1-5 stars with a comment; the average rating shows on event cards and pages, and admins see each comment in the attendee list and CSV export
- Waitlist for full events: students queue up, and the first in line is registered and emailed automatically when a seat opens (someone cancels or capacity is raised)
- The student Dashboard has an "On the waitlist" card: each full event they are queued for and their place in line ("Next in line", "3rd in line"), linking to the event
- Keyboard users get a "Skip to main content" link as the first tab stop; `robots.txt` keeps private pages (admin, dashboard, profile) out of search engines and a sitemap lists the public ones
- Event cards show a "Registered" tag for events you've signed up for, and the Events page has a "Registered" tab listing all of them (upcoming first)
- Dark mode is applied before first paint (no white flash on load), and the app still works in browsers that block local storage (private windows)
- Students can download all the data the app holds about them (profile, registrations, ratings, memberships) as a JSON file from Settings
- The profile shows six small milestones (first event, 5 and 10 events attended, joining clubs, rating an event), worked out from what the student has done, never stored
- Event questions: students ask public questions on an upcoming event's page (first name only, max 3 unanswered each), and an admin or the club's leaders answer; the organiser is emailed when a question arrives and the asker when it is answered
- Walk-ins: on the attendees list an admin or the club's leaders can add a student who turned up without registering, by exact email or student ID; they are registered and checked in at once (capacity still applies)
- Calendar subscription: "Subscribe in your calendar" on the Events page (or on one club's events) gives a link students add once to Google, Apple or Outlook Calendar; new and changed events then show up by themselves (`GET /api/events/calendar.ics`, optionally `?club=<id>`). Calendar files now also escape semicolons correctly
- "Print sheet" in the attendees window prints a paper sign-in sheet (alphabetical, with a Here box and a signature column) as a backup for the door
- The Check-in page keeps a running tally for the session ("Checked in this session: N" and the latest names), counting each student once even if their QR is scanned twice
- Club members list: admins (Admin → Clubs) and a club's leaders (Leader → My clubs) can see who joined a club, newest first, search it and export it as CSV
- Registration deadline: an event can have an optional "Registration closes" time; after it nobody new can register or join the waitlist (existing registrations are kept, and organisers can still add walk-ins)
- Email times are written in Nepal time ("Thu, Jan 10, 2030, 10:00 AM (Nepal time)") instead of the server's UTC; `EVENT_TIMEZONE` can change the zone
- Event times typed in the admin form are sent as exact instants, so an event entered for 10:00 in Nepal shows as 10:00 for everyone (earlier events saved before this fix may show about 5h45m late and can be corrected with Edit)
- Event report: the attendees window has an "Event report" section with registered, attended, attendance rate, average rating and a rating breakdown, plus a button that copies a plain-text summary for club reports
- Install as an app: the dashboard offers an "Install" button (Chrome, Edge, Android) or the Share > Add to Home Screen steps (iPhone/iPad); it disappears once the site is opened as an app
- Club news: an admin or one of a club's leaders can post short updates on the club's page (up to 1000 characters; anyone can read them, only they can write or delete), and each post is recorded in the activity log
- Offline check-in tickets: while online, the app saves each student's check-in QR for upcoming confirmed events on their own phone, and a "My tickets" page (plus a small service worker) shows them with no internet; they are wiped on logout and after the event
- Students can delete their own account from Settings (password required): registrations, memberships and club-leader roles go with it, and so do their upcoming events (registered students are emailed the cancellation) while past events stay as history; admins are removed by another admin so there's always one left
- Event and club photos are requested from Cloudinary at the size they're shown (auto format and quality), so pages load fast on mobile data even when the uploaded photo is several MB
- A club's details window lists its next three upcoming events, linking straight to each
- Shared links show a proper preview in WhatsApp, Messenger, Telegram and similar apps: an event link shows the event's photo, title, date and place; a club link shows the club (a small Vercel function in `frontend/api` answers those apps' link crawlers, while people still get the normal app)
- Every club has its own shareable link (`/clubs?club=<id>`) with a Share button; the Clubs and Events filters (search, category, Upcoming/Past/Registered, "only events with spots left") are stored in the URL, so a filtered list can be shared and survives a refresh
- Accessibility: text meets WCAG AA contrast in light and dark mode (checked with an axe-core sweep of every page, plus dialogs and form error states), long titles never cause sideways scrolling on phones, and ratings are announced to screen readers
- New students see a "Get started" checklist on the dashboard (join a club, pick a favourite, register for an event) that disappears once they have joined a club and registered; it waits until their data has really loaded, so it never flashes for established students on a slow server
- The student dashboard marks events happening within a week as "Today", "Tomorrow" or "In N days"
- Every page sets its own browser-tab title (event pages use the event's name), so tabs, history and screen readers say where you are
- Pagination on all club/event listings and admin tables, so the UI stays fast as data grows
- Personal dashboard with participation charts (Recharts), registered events, and joined clubs
- Editable student profile
- Email notifications: registration confirmation (with an add-to-calendar invite), event reminders (opt out in Settings), reschedule/cancellation notices, account approval decisions, and a security notice whenever the password changes
- "Add to calendar" (Google Calendar link or .ics download) for events you're registered for; the calendar file includes a reminder a day before and an hour before
- "Calendar" view on the Events page: a month grid (Sunday first) with each day's events, tap a day to list them; it keeps your category, search, club and spots-left filters and is shareable as `?view=calendar`
- Each event page suggests "More events you may like": upcoming events from the same club first, then the same category
- "Save for later" bookmark on every event card and event page, and a "Saved" tab on the Events page; kept in your own browser, so no login is needed; upcoming saved events also show on the student dashboard
- A Help & FAQ page (`/help`, linked in the footer) answers the common questions: signing up and approval, registering, waitlists, QR check-in, certificates, reminders and data export
- Contact form that actually emails the college
- Branded HTML emails (verification, password reset, notifications) instead of plain text
- Toast notifications for every action, and a graceful fallback screen if anything ever crashes
- Fully responsive, dark mode support

### For admins
- Dedicated admin dashboard (`/admin`), separate from the student experience
- Full CRUD for clubs and events, including real image upload (Cloudinary)
- Approve or reject pending student registrations
- Promote/demote admin roles, delete accounts
- Per-event attendee list with tap-to-toggle attendance marking, plus one-click CSV export for printable attendance sheets
- Attendance certificates: once an organiser marks a student as attended, they can print a certificate (A4 PDF) with a QR code that anyone can scan to confirm it's genuine
- Attendance report: the admin overview shows turnout (registered vs. attended) and average rating for recent past events; "Download full report (CSV)" exports every past event (club, date, registered, attended, no-shows, rate, rating) for college reports, and club leaders get the same for their own clubs
- Student dashboard nudges students to rate events they attended, with a link to their certificate
- Student dashboard also lists upcoming events from the clubs they joined (that they have not registered for yet)
- Manage Events (admins and club leaders) can be narrowed to All / Upcoming / Past / "Needs a decision" (events with join requests waiting), with counts, on top of the search box
- Admins can duplicate an event (pre-filled form, date left blank) for recurring workshops and fests
- Notification bell: logged-in students get a bell in the top bar with a badge for unseen messages and a short list: you got a seat off the waitlist, a join request was approved or declined, an event you registered for changed or was cancelled, an organiser sent a message, a club you joined announced a new event or sent a message, an event you registered for is coming up within 24 hours, or your question was answered. Admins get a bell message when a student verifies their email and waits for approval, and when someone asks to join an approval-only event. They repeat what the emails say, for students who do not read email; they expire after 60 days, refresh every couple of minutes while the tab is open, and go away with the account
- Optional end time: an event can have an "Ends at" time. Cards and the event page then show "10:00 AM – 12:00 PM", and the calendar buttons, invites and subscription feed use the real length instead of a guessed two hours. Moving the start moves the end too; repeating events keep the same length
- Repeating events: when creating an event, "Repeat" (every week or every two weeks, 2 to 12 events) creates the whole series at once at the same time of day; each one is a normal event with its own seats, sign-ups and ratings that can be edited or deleted separately, and a registration deadline keeps the same distance before every date. Club members are emailed about the first one only
- QR check-in: each registered student has a personal QR code; an organiser scans it with a normal phone camera and the student is marked as attended (codes are signed, so they can't be forged)
- Admins can email everyone registered for an event (venue change, what to bring) straight from its attendee list
- Club leaders: an admin can name up to 10 students as leaders of a club (Admin → Clubs → leaders icon). Leaders get a limited panel to create/edit/delete only their own club's events, see registrants, mark attendance, check students in by QR, message their registrants and club members, and see turnout and ratings for their clubs' past events — nothing else (no users, other clubs or activity log); enforced on the server
- Activity log of admin actions (role changes, approvals/rejections, event and club creates, edits and deletions) with who did them, kept for a year; filter it by people / events / clubs or search by name
- "Add all to calendar" on the student dashboard downloads every confirmed upcoming registration as one .ics file
- Insights card on the admin overview: registrations per month (last 6 months), the most popular clubs by members, and overall turnout at past events
- "Last 7 days" card on the admin overview: new students and new registrations compared with the week before, and how many events are coming up in the next 7 days
- The admin overview also warns when email is not set up, or still goes through Gmail (which free hosting such as Render blocks)
- Live platform stats (total clubs, events, students, registrations)

### Security
- Passwords hashed with bcrypt, never stored in plain text
- The website is sent with a Content-Security-Policy (`frontend/vercel.json`): only its own scripts run, other sites can't frame it, and plugins are off. If you ever edit the small inline theme script in `frontend/index.html`, a test fails until you put its new hash into that policy
- New passwords need at least 8 characters (older, shorter ones still work until changed)
- Rate limiting on login/register/password-reset routes (brute-force protection)
- Event fields are validated server-side (valid date, text length limits, sane capacity) and return a clear 400 instead of a server error
- Club fields are validated server-side too (required name/category/description, text length limits, activities list)
- `helmet` security headers
- The Vercel frontend also sends security headers (no content-type sniffing, no framing, strict referrer policy, microphone/location/payment off)
- Dependabot opens a weekly pull request with dependency updates (security fixes included); CI tests each one
- Organisers' email addresses are never in the public events list; the event page shows the organiser's email only to logged-in students (guests see a "Log in to see their contact email" hint)
- Malformed ids in links or requests (e.g. `/api/events/abc`) get a clean 404 instead of a database error, and auth endpoints reject non-text input with a 400
- Role-based authorization enforced server-side on every protected route, not just hidden in the UI
- Admin role can only ever be granted by an existing admin through the admin panel — never self-assigned at registration
- User-supplied input (names, contact form) is HTML-escaped before being placed in outgoing emails
- Backend trusts exactly one reverse-proxy hop (Render's) so rate limiting keys on the real visitor IP, not the proxy's
- Health check: `GET /api/health` returns 200 when the database is connected and 503 otherwise. Point a free uptime monitor (e.g. UptimeRobot, every 5 minutes) at it to know when the site is down and to stop the free Render tier from sleeping
- Login sessions and single-purpose email links (verify/reset) use distinct token shapes, so a verify/reset link can never be reused as a login session
- Attendee CSV export is sanitized against spreadsheet formula injection
- Changing or resetting a password invalidates every older login session, and a password-reset link can't be replayed after use
- CSRF header required on every state-changing request; admin event and club edits only accept whitelisted fields (a club edit cannot change its leaders or creator)

## Getting Started (local development)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, Cloudinary and email credentials, etc.
npm run dev
```

First-time setup also needs, once:
```bash
npm run seed       # populates sample clubs and events (refuses to run if the database already has clubs or events; add `-- --force` only on a throwaway database)
npm run make-admin -- you@patancollege.edu.np   # makes that (already registered) account an admin and lets it log in
```

`npm run backfill` is only for databases that existed before email verification and approval were added: it approves *every* account that isn't yet verified, so it just reports how many it would change unless you add `-- --yes`.

`npm run fix-event-times -- --before 2026-10-26T04:30:00Z` previews (and with `--yes` applies, once) the 5h45m correction for events created before the time-zone fix; the script's header explains it.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

## Testing

```bash
cd backend
npm test

cd ../frontend
npm test
```

Integration tests run the real server against a real MongoDB (registering,
events, check-in, walk-ins, simultaneous sign-ups, club-leader limits and the
scheduled email jobs). GitHub runs them on every push; to run them yourself
point them at a throwaway database (they create their own data):

```bash
cd backend
MONGO_URI=mongodb://127.0.0.1:27017/pcps_test npm run test:integration
```

Jest unit tests cover the auth flow, registration and capacity rules, admin
safety guards, email notifications, the CSRF middleware and shared utilities.
The frontend has zero-dependency unit tests (Node's built-in runner) for its
shared helpers: CSV export safety, calendar files, page titles and date logic.
GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and the
frontend lint, tests and production build on every push and pull request.

## Sending email from Render's free tier

Render's free web services block outbound SMTP (ports 25, 465 and 587), so the
Gmail App Password setup cannot send from there: sign-up works but the
verification email never leaves. Use Brevo's HTTPS API instead (free, 300 emails
a day, no domain needed). The steps are in `backend/.env.example`; in short,
verify a sender address in Brevo, create an API key, and add `BREVO_API_KEY`
(and `BREVO_SENDER_EMAIL` if the sender differs from `EMAIL_USER`) on Render.
When `BREVO_API_KEY` is set it replaces Gmail SMTP. `npm run test-email -- you@gmail.com`
(from `backend/`) sends one test message and prints the real error if it fails.
The GitHub Actions jobs (reminders, weekly digest) keep using Gmail SMTP by
default, which Actions does not block. To make them send from the same Brevo
sender as the live site instead, also add the repository secrets `BREVO_API_KEY`
and `BREVO_SENDER_EMAIL` (optional; left unset, Gmail is used).

## Scheduled event reminders

`backend/scripts/sendEventReminders.js` emails every registered student whose
event starts within the next 24 hours (skipping anyone who turned reminders
off in Settings, and never emailing the same registration twice). The app has
no always-running process of its own, so `.github/workflows/event-reminders.yml`
runs the script daily. To enable it, add these repository secrets under
**Settings -> Secrets and variables -> Actions**, using the same values as the
backend's `.env`:

- `MONGO_URI`
- `EMAIL_USER`
- `EMAIL_APP_PASSWORD`

It can also be triggered manually from the Actions tab, or locally with
`npm run reminders` from `backend/`.

## Backups

The free MongoDB Atlas plan does not keep backups for you (check the "Backup" tab of your cluster to be sure), so save a copy yourself now and then, and before any risky change. From `backend/`, with your normal `.env` (the live `MONGO_URI`):

```bash
npm run backup                      # saves to ~/pcps-backups/pcps-backup-<date-time>/
npm run backup -- --out D:\backups  # or choose the folder
```

It writes one `.json` file per collection (users, clubs, events, registrations, memberships, waitlist, activity log, site notice) plus a `manifest.json` with the counts. To restore a collection, load its file back with MongoDB's `mongoimport`:

```bash
mongoimport --uri "<MONGO_URI>" --collection users --file users.json --jsonArray
```

A backup contains students' personal details and password hashes, so keep it private. The script refuses to write inside the project folder, because the GitHub repository is public.

## Documentation

- `docs/ADMIN_GUIDE.md` -- how to run the site day to day: approving accounts, roles, check-in, scheduled emails, hosting, backups and what to do when something breaks.
- `docs/HOW_IT_WORKS.md` -- a plain-language tour of how the project works (login, roles, registration, QR check-in, certificates, emails, protections, where to find things in the code).
- `docs/DEMO_GUIDE.md` -- an 8-minute demo script, likely viva questions with honest answers, and what to do if something breaks live.
- `docs/API.md` -- every API endpoint, who may call it and what it does. Generated from the route files (`npm run docs:api` in `backend/`), and a test fails if it goes out of date.
- `backend/README.md` -- request/response shapes, database models and deeper notes on the auth flow (written by hand, so `docs/API.md` is the up-to-date endpoint list).

## Future Improvements

- True Google Workspace-restricted sign-in (PCPS's student email is hosted
  on Google Workspace — a real "Sign in with Google" limited to the
  @patancollege.edu.np domain is possible, but requires coordination with
  PCPS IT and Google's app verification process for production use)
