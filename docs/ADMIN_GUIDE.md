# PCPS Connect — admin and operations guide

For whoever runs the site: staff at PCPS, or whoever takes it over later.
No coding is needed for the daily tasks. The technical sections say which
dashboard to open.

## How people get in

1. A student registers with a `@patancollege.edu.np` address.
2. They click the link in the verification email.
3. An admin approves the account (Admin panel, then **Users**; new accounts show as pending).
4. Only then can they log in. Rejected accounts cannot.

There is no way to become an admin by signing up. A new admin is made by an
existing admin (Users, then edit the role). The very first admin is made once
from a computer that has the project and the live `MONGO_URI` in `backend/.env`:

1. Register that person on the site with their `@patancollege.edu.np` address.
2. In `backend/`, run `npm run make-admin -- their-address@patancollege.edu.np`.

That sets the role to admin and marks the account verified and approved, so
they can log in straight away.

## Roles

| Role | Can do |
| --- | --- |
| Student | Join clubs, register for events, join waiting lists, give feedback, download certificates |
| Club leader | Create and edit events for their own club, see its attendees, check people in, message the club |
| Admin | Everything: clubs, events, users, approvals, leaders, announcements, check-in, audit log, site notice |

Admins make a student a club leader from Admin, then **Clubs**, then Leaders (up to 10 per club).

## Everyday tasks (Admin panel)

- **Approve new accounts:** Users. Approve or reject; students are emailed.
- **Create a club or event:** Clubs or Events, then the New button. Required fields are marked; text has length limits and the form stops you at them.
- **Check people in at the door:** Check-in. Scan the student's QR code with the camera, or type the code. The browser asks for camera permission the first time; choose Allow.
- **Message everyone registered for an event, or everyone in a club:** the announce buttons on Events and Clubs. Students can switch off event reminders and club-update emails in their Settings, and the daily reminders and weekly digest respect that.
- **Answer event questions:** on an event page, admins and the event's club leaders see "Answer" under each question (the answer is public, and the student is emailed). You also get an email when a question arrives. The bin icon removes a question.
- **Add a walk-in:** open an event's attendees list and press "Add a walk-in". Type the student's exact email or student ID; they are registered and marked as attended straight away. Only approved accounts are found, and a full event refuses new walk-ins.
- **Paper backup for the door:** "Print sheet" in the attendees window opens a sign-in sheet (name, student ID, a Here box and a signature line) and starts printing. Allow pop-ups for the site if nothing opens.
- **See who joined a club:** the people icon on a club's row (admins) or "View members" (club leaders) lists members with email and student ID, and can export them as a CSV.
- **Close registration early:** in the event form, "Registration closes (optional)" sets a deadline. After it, students can no longer register or join the waitlist; people already registered keep their place. Clear the field to reopen registration.
- **Older events may show the wrong time:** events created before the time-zone fix were saved about 5 hours 45 minutes late. Open each upcoming one with Edit, check the time in the form, and press Save changes to correct it.
- **Post club news:** open a club on the Clubs page; admins and that club's leaders see a box under "Club news" to post a short update (up to 1000 characters) and a bin icon to delete one.
- **Site-wide notice:** the notice card on the Overview page puts a banner on the site (for example for a holiday or downtime).
- **Who changed what:** the Activity page lists recent admin actions (last 200).
- **Export a list:** the attendee list and the Users page have a CSV download.

## Emails that send themselves

GitHub Actions runs these on a schedule (Actions tab of the repository):

- **Event Reminders:** every day, reminds registered students about events coming up.
- **Weekly Digest:** every Sunday morning (Nepal time), one email per student with next week's events from their clubs.

Both can be run by hand from the Actions tab (Run workflow). Tick "dry run" on the digest to see who would get an email without sending anything.
They need these repository secrets (Settings, Secrets and variables, Actions): `MONGO_URI`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`. If emails stop, check these first: a Gmail app password stops working if the Google account's password is changed.

## Where things run

| Part | Service | What to know |
| --- | --- | --- |
| Website | Vercel | Rebuilds automatically when `main` changes on GitHub |
| API | Render (free tier) | Sleeps when idle; the first request after a quiet period can take 30-60 seconds |
| Database | MongoDB Atlas (free tier) | No automatic backups on the free plan |
| Images | Cloudinary | Event and club pictures |
| Email | Gmail SMTP | Gmail limits how many emails a day one account can send |

The settings for each live in that service's dashboard (Render: Environment; Vercel: Settings, Environment Variables). `backend/.env.example` lists every setting with an explanation. Never put real values in the repository: it is public.

## Keeping it healthy

- **Know when it is down:** point a free uptime monitor (for example UptimeRobot, every 5 minutes) at `https://pcps-connect-backend.onrender.com/api/health`. It answers `{"status":"ok","database":"connected"}` when all is well, and also keeps the free Render tier awake.
- **Back up the database:** from `backend/`, run `npm run backup`. Do it before anything risky and now and then. The backup holds students' personal details, so keep it private (see the Backups section of the README for restoring).
- **Dependabot** opens pull requests for package updates. Merge them when the checks (CI) are green.

## If something goes wrong

| Symptom | Likely cause and fix |
| --- | --- |
| Site loads but data does not, or login spins | The API is waking up (wait a minute) or is down: open the health link above, then check the Render dashboard logs |
| Health link says `database: disconnected` | Atlas: check the cluster is running and the network access list allows Render |
| Students say they get no emails | Check `EMAIL_USER` / `EMAIL_APP_PASSWORD` on Render and in GitHub secrets; look in spam; check Gmail's daily sending limit |
| Check-in camera is black or blocked | Allow the camera for the site in the browser's address-bar settings; use HTTPS (the live site is) |
| Someone cannot log in | Their email may be unverified or the account still pending: Users, then check status. Passwords can be reset by the student from the login page |
| Locked out after many wrong attempts | The limit clears by itself after 15 minutes |
| A bad change was deployed | In Vercel or Render, redeploy the previous successful deployment; in GitHub, revert the commit |
| Data was deleted by mistake | Restore from the latest backup (README, Backups) |

## For developers

- `README.md`: overview, features, running locally, tests.
- `docs/API.md`: every endpoint (generated; `npm run docs:api` in `backend/`).
- `backend/README.md`: request shapes, models, auth flow.
- CI (GitHub Actions) runs the backend and frontend tests, lint and build on every push.
