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
- Real password reset via email
- Full club directory: browse, search, filter by category, join/leave, favorite
- Full event directory: browse, search, filter, register/unregister, live capacity tracking
- Personal dashboard with participation charts (Recharts), registered events, and joined clubs
- Editable student profile
- Contact form that actually emails the college
- Toast notifications for every action
- Fully responsive, dark mode support

### For admins
- Dedicated admin dashboard (`/admin`), separate from the student experience
- Full CRUD for clubs and events, including real image upload (Cloudinary)
- Approve or reject pending student registrations
- Promote/demote admin roles, delete accounts
- Per-event attendee list with tap-to-toggle attendance marking
- Live platform stats (total clubs, events, students, registrations)

### Security
- Passwords hashed with bcrypt, never stored in plain text
- Rate limiting on login/register/password-reset routes (brute-force protection)
- `helmet` security headers
- Role-based authorization enforced server-side on every protected route, not just hidden in the UI

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

## Documentation

See `backend/README.md` for the full API reference (endpoints, request/response
shapes, database models) and deeper notes on the auth flow.

## Future Improvements

- Pagination for clubs/events at larger scale
- Automated tests
- CSV export for admins (e.g. printable attendance sheets)
- True Google Workspace-restricted sign-in (PCPS's student email is hosted
  on Google Workspace — a real "Sign in with Google" limited to the
  @patancollege.edu.np domain is possible, but requires coordination with
  PCPS IT and Google's app verification process for production use)
