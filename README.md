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

**Frontend:** React 18, React Router, Tailwind CSS, Axios, Recharts, React Icons
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
- Email verification + admin approval required before an account can log in
- JWT-based authentication with httpOnly cookies (secure against XSS token theft)
- Real password reset via email, plus in-app change password from Settings
- Full club directory: browse, search, filter by category, join/leave, favorite
- Full event directory: browse, search (by name, place or club), filter, register/unregister, live capacity tracking, and a "View events" link from each club that shows only its events
- Club events: an event can be hosted by a club, and members of that club are emailed when it is announced (opt out in Settings)
- Weekly digest: every Sunday morning each student gets one email listing the next 7 days of events from the clubs they joined (skipping events they already registered for or that are full; nobody gets an empty digest). Runs from a GitHub Actions schedule, can be previewed with a dry run, and the "Club updates" switch in Settings turns it off
- Events can require organiser approval ("Approve each person who joins" when creating an event): students send a request instead of being confirmed, a seat is held for them, and the organiser approves or declines from the attendee list; the student is emailed either way and only approved students get the QR code, calendar links and reminders
- Admins can email a message to all members of a club from Admin → Clubs (members who turned off club updates are skipped)
- Admins can approve every pending sign-up at once ("Approve all" on the Pending filter, respects search) — each person is emailed and it's logged as one activity entry
- Admin → Users can be filtered by approval status (pending / approved / rejected, with counts) and searched by student ID
- Admin → Users can export the current (filtered) list of students as an Excel-safe CSV
- "Share this event" button on every event page (phone share sheet, or copies the link on desktop)
- Installable on phones: "Add to home screen" gives a PCPS Connect app icon that opens full-screen (no offline caching, so data is never stale)
- Admins can see who is on an event's waitlist, in promotion order, in the Attendees window
- The Attendees window has a quick search (name, email, student ID) and a "Not yet attended" filter for marking people at the door
- Post-event feedback: students marked as attended can rate the event 1-5 stars with a comment; the average rating shows on event cards and pages, and admins see each comment in the attendee list and CSV export
- Waitlist for full events: students queue up, and the first in line is registered and emailed automatically when a seat opens (someone cancels or capacity is raised)
- Keyboard users get a "Skip to main content" link as the first tab stop; `robots.txt` keeps private pages (admin, dashboard, profile) out of search engines and a sitemap lists the public ones
- Event cards show a "Registered" tag for events you've signed up for, and the Events page has a "Registered" tab listing all of them (upcoming first)
- Dark mode is applied before first paint (no white flash on load), and the app still works in browsers that block local storage (private windows)
- Students can download all the data the app holds about them (profile, registrations, ratings, memberships) as a JSON file from Settings
- Students can delete their own account from Settings (password required): registrations, memberships, events they created and club-leader roles go with it; admins are removed by another admin so there's always one left
- Event and club photos are requested from Cloudinary at the size they're shown (auto format and quality), so pages load fast on mobile data even when the uploaded photo is several MB
- A club's details window lists its next three upcoming events, linking straight to each
- Shared links show a proper preview in WhatsApp, Messenger, Telegram and similar apps: an event link shows the event's photo, title, date and place; a club link shows the club (a small Vercel function in `frontend/api` answers those apps' link crawlers, while people still get the normal app)
- Every club has its own shareable link (`/clubs?club=<id>`) with a Share button; the Clubs and Events filters (search, category, Upcoming/Past/Registered, "only events with spots left") are stored in the URL, so a filtered list can be shared and survives a refresh
- Accessibility: text meets WCAG AA contrast in light and dark mode (checked with an axe-core sweep of every page), long titles never cause sideways scrolling on phones, and ratings are announced to screen readers
- The student dashboard marks events happening within a week as "Today", "Tomorrow" or "In N days"
- Every page sets its own browser-tab title (event pages use the event's name), so tabs, history and screen readers say where you are
- Pagination on all club/event listings and admin tables, so the UI stays fast as data grows
- Personal dashboard with participation charts (Recharts), registered events, and joined clubs
- Editable student profile
- Email notifications: registration confirmation (with an add-to-calendar invite), event reminders (opt out in Settings), reschedule/cancellation notices, account approval decisions, and a security notice whenever the password changes
- "Add to calendar" (Google Calendar link or .ics download) for events you're registered for
- "Calendar" view on the Events page: a month grid (Sunday first) with each day's events, tap a day to list them; it keeps your category, search, club and spots-left filters and is shareable as `?view=calendar`
- Each event page suggests "More events you may like": upcoming events from the same club first, then the same category
- "Save for later" bookmark on every event card and event page, and a "Saved" tab on the Events page; kept in your own browser, so no login is needed; upcoming saved events also show on the student dashboard
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
- Attendance report: the admin overview shows turnout (registered vs. attended) and average rating for recent past events
- Student dashboard nudges students to rate events they attended, with a link to their certificate
- Student dashboard also lists upcoming events from the clubs they joined (that they have not registered for yet)
- Admins can duplicate an event (pre-filled form, date left blank) for recurring workshops and fests
- QR check-in: each registered student has a personal QR code; an organiser scans it with a normal phone camera and the student is marked as attended (codes are signed, so they can't be forged)
- Admins can email everyone registered for an event (venue change, what to bring) straight from its attendee list
- Club leaders: an admin can name up to 10 students as leaders of a club (Admin → Clubs → leaders icon). Leaders get a limited panel to create/edit/delete only their own club's events, see registrants, mark attendance, check students in by QR, message their registrants and club members, and see turnout and ratings for their clubs' past events — nothing else (no users, other clubs or activity log); enforced on the server
- Activity log of admin actions (role changes, approvals/rejections, deletions) with who did them, kept for a year; filter it by people / events / clubs or search by name
- "Add all to calendar" on the student dashboard downloads every confirmed upcoming registration as one .ics file
- Insights card on the admin overview: registrations per month (last 6 months), the most popular clubs by members, and overall turnout at past events
- Live platform stats (total clubs, events, students, registrations)

### Security
- Passwords hashed with bcrypt, never stored in plain text
- Rate limiting on login/register/password-reset routes (brute-force protection)
- `helmet` security headers
- Role-based authorization enforced server-side on every protected route, not just hidden in the UI
- Admin role can only ever be granted by an existing admin through the admin panel — never self-assigned at registration
- User-supplied input (names, contact form) is HTML-escaped before being placed in outgoing emails
- Backend trusts exactly one reverse-proxy hop (Render's) so rate limiting keys on the real visitor IP, not the proxy's
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
npm run seed       # populates sample clubs and events
npm run backfill   # marks any pre-existing accounts as verified + approved
```

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

Jest unit tests cover the auth flow, registration and capacity rules, admin
safety guards, email notifications, the CSRF middleware and shared utilities.
The frontend has zero-dependency unit tests (Node's built-in runner) for its
shared helpers: CSV export safety, calendar files, page titles and date logic.
GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and the
frontend lint, tests and production build on every push and pull request.

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

## Documentation

See `backend/README.md` for the full API reference (endpoints, request/response
shapes, database models) and deeper notes on the auth flow.

## Future Improvements

- True Google Workspace-restricted sign-in (PCPS's student email is hosted
  on Google Workspace — a real "Sign in with Google" limited to the
  @patancollege.edu.np domain is possible, but requires coordination with
  PCPS IT and Google's app verification process for production use)
