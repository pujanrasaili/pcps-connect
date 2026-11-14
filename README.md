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
**Infrastructure:** MongoDB Atlas (database), Cloudinary (image storage), Brevo (transactional email; Gmail SMTP via Nodemailer as a fallback), Vercel (frontend hosting), Render (backend hosting)

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
- Join request reminders: twice a week, leaders of a club that approves its members (admins, if it has no leaders) get one email when students have waited more than 5 days for a decision; nothing is sent when nobody is overdue. Same GitHub Actions setup and dry run as the digest
- Weekly digest: every Sunday morning each student gets one email listing the next 7 days of events from the clubs they joined (skipping events they already registered for or that are full; nobody gets an empty digest). Runs from a GitHub Actions schedule, can be previewed with a dry run, and the "Club updates" switch in Settings turns it off
- Events can require organiser approval ("Approve each person who joins" when creating an event): students send a request instead of being confirmed, a seat is held for them, and the organiser approves or declines from the attendee list; the student is emailed either way and only approved students get the QR code, calendar links and reminders
- Admins can email a message to all members of a club from Admin → Clubs (members who turned off club updates are skipped)
- Site announcement: admins publish (or remove) a short banner shown at the top of every page from Admin → Overview ("Information" or "Important" style); visitors can close it, and an edited announcement shows again. Changes are written to the activity log
- Admins can approve every pending sign-up at once ("Approve all" on the Pending filter, respects search) — each person is emailed and it's logged as one activity entry
- Admin → Users can be filtered by approval status (pending / approved / rejected, with counts) and searched by student ID
- Admins can mark a student's email as verified by hand ("Mark verified" on an Unverified row, after a confirmation, recorded in the activity log) when the verification email never arrived; it does not approve the account
- Admin → Users can export the current (filtered) list of students as an Excel-safe CSV (including the language each student's emails are sent in)
- "Share this event" button on every event page (phone share sheet, or copies the link on desktop)
- Installable on phones: "Add to home screen" gives a PCPS Connect app icon that opens full-screen (no offline caching, so data is never stale)
- Admins can see who is on an event's waitlist, in promotion order, in the Attendees window
- The Attendees window has a quick search (name, email, student ID) and a "Not yet attended" filter for marking people at the door
- Post-event feedback: students marked as attended can rate the event 1-5 stars with a comment; the average rating shows on event cards and pages, and admins see each comment in the attendee list and CSV export
- Waitlist for full events: students queue up, and the first in line is registered and emailed automatically when a seat opens (someone cancels or capacity is raised)
- The student Dashboard has a "News from your clubs" card: the latest posts (up to 5, from the last 30 days) from the clubs the student has joined, each linking to that club's page; it is hidden when there is none
- The student Dashboard has an "On the waitlist" card: each full event they are queued for and their place in line ("Next in line", "3rd in line"), linking to the event
- Each event page also sets its own search-result description (date and place, then the start of the event description) while it is open
- Each event page carries schema.org "Event" data (name, start and end time, place, organiser, price) so search engines can show it as an event; it is added only for events that have a valid date and is removed when you leave the page
- People whose device asks for reduced motion get no tilting cards, no smooth scrolling and no animated transitions (the hero effect, scroll reveals and autoplay video already respected it)
- Keyboard users get a "Skip to main content" link as the first tab stop; `robots.txt` keeps private pages (admin, dashboard, profile) out of search engines and a sitemap lists the public ones plus every upcoming or recent event (built on request from the API and cached for an hour; if the server is asleep it still lists the fixed pages)
- Event cards show a "Registered" tag for events you've signed up for, and the Events page has a "Registered" tab listing all of them (upcoming first)
- Dark mode is applied before first paint (no white flash on load), and the app still works in browsers that block local storage (private windows)
- Students can download all the data the app holds about them (profile, registrations, ratings, memberships, club join requests, questions asked on events, Contact messages, notifications) as a JSON file from Settings
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
- Club news: an admin or one of a club's leaders can post short updates on the club's page (up to 1000 characters, with an optional photo that is shrunk before upload and removed from Cloudinary when the post or club is deleted; anyone can read them, only they can write, edit or delete; an edited post shows "edited", and one post per club can be pinned to the top; members of the club get a message in their bell when a post goes up), and each post is recorded in the activity log
- Club idea box: a member of a club can suggest something the club could do (up to 300 characters, at most 3 waiting per member) from the club's window; only that club's leaders and the admins can read the ideas (a member sees and can take back their own), the leaders get a bell notification, and ideas are removed with the account or the club and included in "Download my data"; the Help page explains it
- Event volunteers: an event's organisers can list up to 5 helper roles (a name and a number of places, e.g. registration desk, setup crew) in a "Help out" box on the event page; a logged-in student signs up for one role per event (a full role is refused, even if two people tap together) and can cancel; organisers also see who signed up, and removing a role removes its sign-ups; sign-ups are removed with the account or the event and included in "Download my data"; the Help page explains it; the student Dashboard lists the upcoming events they signed up to help at; after the event organisers tick who really helped, and those students can print a volunteering certificate with a QR code anyone can scan to confirm it (the public verify page shows the role); organisers can download the helpers as a CSV; duplicating an event (or repeating it weekly) can copy its roles, with the same places and no sign-ups; students helping at an event are told (email and bell) when it is rescheduled or cancelled or the organisers send a message, along with the registered attendees; the event's creator gets a bell message when a role's last place is taken; the day-before reminder job also emails (and rings the bell for) each student helping at an event, naming their role, unless they turned event reminders off
- Event poster: organisers (admins and the club's leaders) see "Print a poster" on an upcoming event, which opens `/events/:id/poster`, a printable A4 poster with the title, date and time, place, club, the event photo and a QR code that opens the event page. It is built in the browser from the event data, with no extra server work.
- Activity record: "Activity record" on the Profile opens `/record`, a printable page (A4, Print / Save as PDF) with the student's name, ID and program, the events they attended and helped at (only what organisers confirmed, newest first) and their clubs. It is built from the student's own data only (`GET /api/registrations/record`).
- Online link: organisers (admins and the club's leaders) can paste an https meeting link (Meet, Zoom...) on an event page. It is hidden from every ordinary event response and handed out only by `GET /api/events/:id/join-link` to the event's organisers and to students with a confirmed registration, who see a "Join online" button until the event is over. Setting or removing it is written to the activity log. The backup script also saves fields hidden from ordinary queries (password hashes, club leader lists, join links).
- Phone app feel: on a phone the site has a bottom tab bar (Home, Events, Clubs, then Notice board or Manage, and Dashboard; it hides while the keyboard is open), pop-ups slide up as a bottom sheet you can swipe down to close, the footer is cut down to the help, contact and policy links, the dashboard and admin menus are one swipeable row that opens on the current page, and cards dip slightly when tapped. Pulling the page down from the top reloads the events, clubs and your registrations (handy when the site is installed on the home screen). Inputs use 16px text so iPhones do not zoom in. The status bar colour follows light and dark mode. Events and Clubs show grey placeholder cards while loading. On an event page the Register button is also pinned above the tab bar. Computers keep the normal web layout.
- Club stats: on My Clubs, a club's leaders (and admins) press "Stats" for a one-club summary: members, how many joined in the last 30 days compared with the 30 days before, upcoming and past events, turnout (registered students who showed up, from the organisers' check-in) and average rating, and the latest events. Counts only, no names or emails (`GET /api/leader/clubs/:id/stats`).
- Club leaderboard: the Clubs page ends with a "Most active clubs" card, the top five clubs by events held in the last 90 days (then by members). Club names and counts only; it stays hidden until a club has held an event (`GET /api/stats/clubs`). A co-hosted event counts for every club that ran it.
- Co-hosted events: an admin can name up to two more clubs on an event (admin event form, "Co-hosting clubs"). Their leaders can manage the event, its page says "Hosted by A + B", club stats count it, and members of every hosting club get it in the weekly digest. Leaders cannot add co-hosts themselves.
- Dashboard "In topics you follow": upcoming events in the categories a student follows, soonest first, leaving out ones already under "From your clubs" or registered.
- Topics you follow: in Settings a student ticks up to five event categories (the ones events actually use, except "General"). When an admin or leader announces a new event in one, they get a bell message, unless they already hear from a hosting club or turned club updates off. Stored lower case on the account (`interests`), included in the data download.
- Club poster: club leaders and admins open a club's window and press the printer icon for an A4 poster with the club's name, a short description and a QR code that opens the club's page, for campus notice boards (`/clubs/:id/poster`).
- Notice board: logged-in students open "Notice board" in the Dashboard menu to post something lost, found or a short campus notice (title up to 80, details up to 300, an optional contact up to 60). Posts show only the first name, vanish after 14 days (a database expiry index), and each student can have 3 up at once. The author can remove their own post; an admin can remove any (logged in the activity log). The author of a lost or found post can mark it resolved, which labels it and makes it disappear 2 days later. Other students can report a post (once each): admins get a bell message on the first report, and after 3 different students report it the post is hidden from students until an admin removes it or it expires (admins still see it, with its report count). It is deleted with the account and left out of backups on purpose.
- Phone/browser alerts: with "Alerts on this device" switched on in Settings (per device, with the browser's own permission), every bell message also pops up on that phone or browser even when the site is closed, and tapping it opens the right page. It is off until the server has a VAPID key pair (`npx web-push generate-vapid-keys`, then `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and optionally `VAPID_SUBJECT` on Render); until then the switch does not appear. Only the real browser push services are accepted as device addresses (Google, Mozilla, Apple, Windows), so a student can't make the server call an arbitrary address. Logging out removes that device's alerts, so a shared phone never shows the previous student's messages (switch them on again in Settings after logging in). Up to 10 devices per student; expired devices are forgotten automatically and an account deletion removes them.
- Offline check-in tickets: while online, the app saves each student's check-in QR for upcoming confirmed events on their own phone, and a "My tickets" page (plus a small service worker, which keeps only the newest 200 downloaded app files so old deploys don't pile up on a phone) shows them with no internet; they are wiped on logout and after the event
- Students can delete their own account from Settings (password required): registrations, memberships and club-leader roles go with it, and so do their upcoming events (registered students are emailed the cancellation) while past events stay as history; admins are removed by another admin so there's always one left
- Event and club photos are requested from Cloudinary at the size they're shown (auto format and quality), so pages load fast on mobile data even when the uploaded photo is several MB
- A club's details window lists its next three upcoming events, linking straight to each
- Shared links show a proper preview in WhatsApp, Messenger, Telegram and similar apps: an event link shows the event's photo, title, date and place; a club link shows the club (a small Vercel function in `frontend/api` answers those apps' link crawlers, while people still get the normal app)
- Every club has its own shareable link (`/clubs?club=<id>`) with a Share button; the Clubs and Events filters (search, category, Upcoming/Past/Registered, "only events with spots left", "free events only") are stored in the URL, so a filtered list can be shared and survives a refresh
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
- Nepali language option: a "नेपाली" / "English" switch in the top bar translates the whole interface: every student and admin page, pop-up, toast message and screen-reader label, plus dates with Nepali month and weekday names. The exceptions are the Help, Terms of Use and Privacy Policy text and the printed certificate body, which stay in English until a Nepali speaker reviews the wording. Text without a translation falls back to English (never blank), the choice is remembered on the device, and Devanagari gets its own typography rules. The Nepali dictionary (`frontend/src/i18n/ne.js`, English text is the key) is a separate download that English visitors never fetch; a test fails if a translated screen uses a text that is missing from it. Have a Nepali speaker review `ne.js` before relying on it Nepali text is drawn in Noto Sans Devanagari (loaded only when a page shows Nepali), so it looks the same on every phone and computer.
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
- Clubs can approve their members: an admin ticks "Approve each person who joins" on a club, "Join Club" becomes "Request to join" (then "Request sent", which can be withdrawn), the club's leaders and admins get a bell message and decide from the Members window (Approve / Decline), and the student is told either way. Off by default
- Notification bell: logged-in students get a bell in the top bar with a badge for unseen messages and a short list: you got a seat off the waitlist, a join request was approved or declined, an event you registered for changed or was cancelled, an organiser sent a message, a club you joined announced a new event or sent a message, an event you registered for is coming up within 24 hours, or your question was answered. Admins get a bell message when a student verifies their email and waits for approval, and when someone asks to join an approval-only event. They repeat what the emails say, for students who do not read email; they expire after 60 days, refresh every couple of minutes while the tab is open, and go away with the account
- Optional end time: an event can have an "Ends at" time. Cards and the event page then show "10:00 AM – 12:00 PM", and the calendar buttons, invites and subscription feed use the real length instead of a guessed two hours. Moving the start moves the end too; repeating events keep the same length
- Repeating events: when creating an event, "Repeat" (every week or every two weeks, 2 to 12 events) creates the whole series at once at the same time of day; each one is a normal event with its own seats, sign-ups and ratings that can be edited or deleted separately, and a registration deadline keeps the same distance before every date. Club members are emailed about the first one only
- QR check-in: each registered student has a personal QR code; an organiser scans it with a normal phone camera and the student is marked as attended (codes are signed, so they can't be forged)
- Admins can email everyone registered for an event (venue change, what to bring) straight from its attendee list
- Club leaders: an admin can name up to 10 students as leaders of a club (Admin → Clubs → leaders icon). Leaders get a limited panel to create/edit/delete only their own club's events, see registrants, mark attendance, check students in by QR, message their registrants and club members, and see turnout and ratings for their clubs' past events — nothing else (no users, other clubs or activity log); enforced on the server
- Event photos: an admin or the event's club leader can add up to 8 photos to an event (big phone photos are shrunk automatically before upload) from the event page; everyone sees them as a gallery, and organisers can remove them (both are recorded in the activity log)
- Contact form messages are saved (kept 180 days, deleted with the sender's account) and listed for admins under Admin → Messages with Reply, Mark handled and Delete; admins get a bell notification for each new message, and the email still goes out as before
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
- Rate limiting on login/register/password-reset routes (brute-force protection); the Contact form has its own limit and a hidden spam-trap field, and joining or leaving clubs is limited per student
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
- Deployment smoke test: after a deploy, run `npm run smoke` in `backend/` from your own computer. It loads the live API and website and prints PASS/FAIL for: database connected, email set up (Brevo), events and clubs load, private pages refuse visitors, security headers, and direct page links. It is read-only and can take a minute if the server was asleep
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
A separate job opens every public page, the Dashboard, the student pages and every admin page in a real Chromium, in
English and Nepali, on a phone-sized screen with a mocked API, and fails on page
errors, sideways scrolling or accessibility violations; it also runs the accessibility checks again in dark mode, uses the site by keyboard only (skip link, dialogs), and walks through the Contact form, the Profile page (editing details, rating an event), the Settings page (email switches, password change, account deletion), an admin creating, editing and deleting events and clubs and approving new sign-ups, joining clubs, finding events with the search and filters, signing up, logging in, resetting a forgotten password, registering for and leaving an event, switching language, checking a certificate from its QR code (genuine, fake and server-error answers), the email verification link, the 404 page, saved offline tickets (including going offline) the printable certificate, the admin's message inbox (search, filter, handled, delete) door check-in (scanned link, pasted code, repeats, errors) the waitlist of a full event (joining, leaving, place in line, Dashboard card) and an organiser's attendee list (marking attendance, approving requests, walk-ins, messaging everyone, CSV export) and the public questions and answers on an event page (asking, answering, deleting, who may do which) and the event photo gallery (adding, removing, the 8-photo limit, who may manage it) and the site announcement banner (closing it, editing it, publishing and removing it as an admin) and the Events month view and calendar subscription (month navigation, day lists, Nepali names, Apple/Outlook and copy-link) and the account side of Settings (downloading my data, deleting my account, dark mode) and the notification bell (unread badge, marked seen on opening, links, Escape, focus) and the site-wide search (the / shortcut, clubs and events, no-match message) and the Help page (open and close, Nepali, linking straight to one question with /help#topic) the admin activity log (labels, filter chips, search, paging) and the student Dashboard (checklist, stat tiles, unregister and withdraw, rating nudge, clubs and saved events, calendar file) and a club leader's My Clubs (join requests, members, messaging members), and posting, pinning, editing and deleting club news, and the favourite-club heart and the install-app card, and the Nepali Privacy and Terms pages, and event volunteer roles and the Dashboard helping card, and the Settings alerts switch (`cd frontend && npm run e2e`;
see `frontend/e2e/`).

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

It writes one `.json` file per collection (users, clubs, events, registrations, memberships, waitlist, club join requests, club news posts, event questions, event volunteers, activity log, contact messages, site notice) plus a `manifest.json` with the counts. To restore, use the restore script. Point `MONGO_URI` (in `backend/.env`) at a new, empty database (for example a fresh cluster or database name in Atlas) and run:

```bash
npm run restore -- "D:\backups\pcps-backup-2026-11-11-0700"
```

It first checks every file against `manifest.json` (a damaged backup changes nothing), shows the database name and asks you to type it to continue (`--yes` skips the question), then fills only collections that are empty: nothing is overwritten or deleted. Ids, dates and password hashes come back exactly as saved. After restoring, point the live backend's `MONGO_URI` (Render → Environment) at that database. Practise it once on a spare database before you ever need it.

A backup contains students' personal details and password hashes, so keep it private. The script refuses to write inside the project folder, because the GitHub repository is public.

## Documentation

- `docs/ADMIN_GUIDE.md` -- how to run the site day to day: approving accounts, roles, check-in, scheduled emails, hosting, backups and what to do when something breaks.
- `docs/HOW_IT_WORKS.md` -- a plain-language tour of how the project works (login, roles, registration, QR check-in, certificates, emails, protections, where to find things in the code).
- `docs/LIVE_CHECKLIST.md` -- the checks that can only be done on the real site (smoke test, club news photo, a second account, volunteering, reminder emails, Nepali pages), step by step.
- `docs/DEMO_GUIDE.md` -- an 8-minute demo script, likely viva questions with honest answers, and what to do if something breaks live.
- `docs/API.md` -- every API endpoint, who may call it and what it does. Generated from the route files (`npm run docs:api` in `backend/`), and a test fails if it goes out of date.
- `backend/README.md` -- request/response shapes, database models and deeper notes on the auth flow (written by hand, so `docs/API.md` is the up-to-date endpoint list).

## Future Improvements

- True Google Workspace-restricted sign-in (PCPS's student email is hosted
  on Google Workspace — a real "Sign in with Google" limited to the
  @patancollege.edu.np domain is possible, but requires coordination with
  PCPS IT and Google's app verification process for production use)
