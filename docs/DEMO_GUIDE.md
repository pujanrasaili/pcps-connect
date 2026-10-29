# Demo and viva guide

A script for showing PCPS Connect to a teacher or panel in about 8 minutes,
plus the questions people usually ask and honest answers. Read
`HOW_IT_WORKS.md` first; this page is the short version for the day.

## Before you start (5 minutes)

1. Open `https://pcps-connect-backend.onrender.com/api/health` and wait for
   `"status":"ok"`. The free server sleeps, so the first request can take a
   minute. Do this before the audience arrives.
2. Log in on two browsers (or one normal and one private window): one as an
   admin, one as a student.
3. Make sure at least one upcoming event exists, with a few seats left.
4. Keep a phone ready for the QR check-in step.

## The 8-minute demo

| Min | Show | Say |
| --- | --- | --- |
| 0-1 | Home page, then the Clubs page | Students browse clubs and join with one click; filters live in the URL so a filtered list can be shared. |
| 1-2 | Sign-up page and the confirmation screen | Only `@patancollege.edu.np` emails work (checked on the server). The account needs email verification and admin approval. |
| 2-3 | Events page, register for an event | Capacity is checked on the server. If the event is full the student joins a waitlist and is promoted automatically when a seat opens. |
| 3-4 | Student dashboard | Charts, upcoming events, "Add to calendar", the waitlist card. |
| 4-5 | Admin: create an event | Admins and club leaders manage events. Times typed in Nepal time are stored as exact instants. |
| 5-6 | Admin: attendee list, QR check-in on the phone | Each student has a signed QR code, so it cannot be forged. Scanning marks them attended. |
| 6-7 | Certificate and event report | Attended students get a certificate with a QR that anyone can verify. Admins see turnout and ratings. |
| 7-8 | Admin overview, activity log | Every admin action is logged with who did it. |

If something is slow, say "the free hosting tier wakes up slowly" and move on.
It is true, and it is written in the README.

## Likely questions

**Why MERN?** One language (JavaScript) on both sides, a large community, and
MongoDB suits data that changes shape (clubs, events, registrations).

**How is login secured?** Passwords are hashed with bcrypt. The login token
lives in an httpOnly cookie, so scripts on the page cannot read it. Every
state-changing request needs a CSRF header. Login and password routes are
rate-limited.

**What stops a student acting as an admin?** The server checks the role on
every protected route. Hiding a button in the UI is not security, so the
server is the real check. Tests cover this for every route.

**What if two students take the last seat at the same moment?** The server
counts, inserts, counts again and rolls back if it went over capacity. It
retries a few times, so nobody is overbooked and a free seat is not lost.

**How do the emails work?** Verification, reset, confirmations and reminders
go through a mail service (Brevo over HTTPS in production, because the free
host blocks SMTP). Reminders and the weekly digest run on a GitHub Actions
timer.

**How did you test it?** Hundreds of automated tests (`npm test` in `backend`
and `frontend`), integration tests against a real MongoDB, and a GitHub
Actions pipeline that runs them on every push.

**What would you improve with more time?** Real push notifications, a
student-facing mobile app wrapper, and load testing with real student numbers.

**Did you build this alone?** Answer honestly. For example: "I designed it
and ran it, and I built it with AI assistance (Claude), reviewing and
deploying every change myself." Be ready to explain any file you are asked
about; `HOW_IT_WORKS.md` tells you where to look.

## If something breaks live

- Page will not load: wait 60 seconds, the server is waking up.
- Login fails: check `/api/health`; if the database is down, show the
  screenshots instead.
- Email did not arrive: show the admin "Mark verified" button and explain it
  as the fallback.
- Keep 3-4 screenshots of the main screens on your phone as a backup.
