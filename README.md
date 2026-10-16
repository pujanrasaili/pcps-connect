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
- Full event directory: browse, search, filter, register/unregister, live capacity tracking
- Club events: an event can be hosted by a club, and members of that club are emailed when it is announced (opt out in Settings)
- Waitlist for full events: students queue up, and the first in line is registered and emailed automatically when a seat opens (someone cancels or capacity is raised)
- Pagination on all club/event listings and admin tables, so the UI stays fast as data grows
- Personal dashboard with participation charts (Recharts), registered events, and joined clubs
- Editable student profile
- Email notifications: registration confirmation, event reminders (opt out in Settings), reschedule/cancellation notices, account approval decisions, and a security notice whenever the password changes
- "Add to calendar" (Google Calendar link or .ics download) for events you're registered for
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
- CSRF header required on every state-changing request; admin event edits only accept whitelisted fields

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
```

Jest unit tests cover the auth flow, registration and capacity rules, admin
safety guards, email notifications, the CSRF middleware and shared utilities.
GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and a
lint + production build of the frontend on every push and pull request.

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
