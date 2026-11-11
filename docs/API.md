# PCPS Connect API reference

Generated from the route files by `npm run docs:api` (in `backend/`) -- do not edit by hand.
Every state-changing request (POST/PUT/PATCH/DELETE) must send the header `X-Requested-With: XMLHttpRequest` (a CSRF defence); the frontend does this automatically.
Logged-in access uses an httpOnly cookie set by `POST /api/auth/login`.

Access levels: **Anyone**, **Logged-in student**, **Admin or club leader** (leaders only for their own clubs' events), **Admin only**.
112 endpoints.

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
| GET | `/api/events/volunteering/mine` | Logged-in student | The upcoming events you signed up to help at, with your role, soonest first. |
| GET | `/api/events/:id/join-link` | Logged-in student | An event's online meeting link, for its organisers and students with a confirmed registration. |
| PUT | `/api/events/:id/join-link` | Logged-in student (rate limited) | Set or remove an event's online meeting link (organisers only; https links only). |
| GET | `/api/events/:id/volunteers` | Anyone (logged-in users see more) | The helper roles at an event, how many places are taken and whether you hold one; organisers also see who signed up. |
| POST | `/api/events/:id/volunteers` | Logged-in student (rate limited) | Sign up to help in one role at an upcoming event (one role per event; a full role is refused). |
| GET | `/api/events/:id/volunteers/certificate` | Logged-in student (rate limited) | Your volunteering certificate for an event, once an organiser has marked that you helped. |
| PUT | `/api/events/:id/volunteers/:userId/attended` | Admin or club leader (rate limited) | Mark that a volunteer really helped at an event (admins and the event's club leaders; only once the event has started). |
| DELETE | `/api/events/:id/volunteers` | Logged-in student (rate limited) | Cancel your own volunteer sign-up for an event. |
| PUT | `/api/events/:id/volunteer-roles` | Admin or club leader (rate limited) | Set the volunteer roles of an event (up to 5, with a name and places each); admins and the event's club leaders only. A role left out is removed with its sign-ups. |
| POST | `/api/events/create` | Admin or club leader (rate limited; image upload) | Create an event (admins, or a leader for their own club), with an optional image. Send repeat (weekly or biweekly) and repeatCount (2 to 12) to create a series of separate events. An optional endDate (after the start, at most 7 days long) sets when it ends. |
| PUT | `/api/events/:id` | Admin or club leader (image upload) | Edit an event; registered students are emailed if the date or place changes. |
| POST | `/api/events/:id/photos` | Admin or club leader (rate limited; image upload) | Add one photo (max 5 MB, jpg/png/webp/gif) to an event's gallery, up to 8; admins and the event's club leaders only. |
| DELETE | `/api/events/:id/photos` | Admin or club leader (rate limited) | Remove a photo from an event's gallery and from image storage (pass its address as ?url=); admins and the event's club leaders only. |
| DELETE | `/api/events/:id` | Admin or club leader | Delete an event; registered students are emailed the cancellation. |

## /api/registrations

| Method | Path | Who | What it does |
|---|---|---|---|
| POST | `/api/registrations/register` | Logged-in student (rate limited) | Register for an event (or request to join, if the event needs approval). |
| GET | `/api/registrations/my` | Logged-in student | Your own registrations. |
| GET | `/api/registrations/record` | Logged-in student | Your own activity record: events you attended and helped at (confirmed by organisers) and your clubs, for printing. |
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
| GET | `/api/admin/club-request-counts` | Admin or club leader | How many students are waiting to join each club you manage (clubs that approve their members), for the badges in the club lists. |
| GET | `/api/admin/clubs/:id/requests` | Admin or club leader | List the students waiting to join a club that approves its members, oldest first; admins and that club's leaders only. |
| PUT | `/api/admin/clubs/:id/requests/:requestId/decision` | Admin or club leader | Approve or decline a student's request to join a club; approving makes them a member and both outcomes notify them (a decline can carry a short note of up to 300 characters for the email); admins and that club's leaders only. |
| POST | `/api/admin/clubs/:id/announce` | Admin or club leader (rate limited) | Email everyone who joined a club (members who opted out are skipped). |
| POST | `/api/admin/events/:id/walk-in` | Admin or club leader (rate limited) | Add a student who turned up without registering (by exact email or student ID) as registered and attended; admins and that event's club leaders only. |
| PUT | `/api/admin/registrations/:id` | Admin or club leader | Mark a registration as attended or not. |
| PUT | `/api/admin/registrations/:id/decision` | Admin or club leader | Approve or decline a join request for an approval-only event. |
| GET | `/api/admin/attendance-report` | Admin or club leader | Turnout and ratings for recent past events (add ?all=1 for every past event, up to 500). |
| POST | `/api/admin/check-in` | Admin or club leader | Check a student in by scanning or typing their registration code. |
| GET | `/api/admin/messages` | Admin only | Messages sent through the Contact form (newest first, up to 200) and how many are not handled yet; admins only. |
| PUT | `/api/admin/messages/:id` | Admin only | Mark a contact message as handled or not handled; admins only. |
| DELETE | `/api/admin/messages/:id` | Admin only | Delete a contact message; admins only. |
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
| POST | `/api/clubs/:id/posts` | Logged-in student (rate limited; image upload) | Post a short news update on a club (admins and that club's leaders only). |
| PATCH | `/api/clubs/:id/posts/:postId` | Logged-in student (rate limited) | Fix the text of one news post (admins and that club's leaders only). |
| PUT | `/api/clubs/:id/posts/:postId/pin` | Logged-in student (rate limited) | Pin a news post to the top of the club page, or unpin it (admins and that club's leaders only; one pinned post per club). |
| DELETE | `/api/clubs/:id/posts/:postId` | Logged-in student (rate limited) | Delete one news post (admins and that club's leaders only). |
| GET | `/api/clubs/:id/ideas` | Logged-in student | Ideas members suggested to a club: the club's leaders and admins see all of them, anyone else sees only their own. |
| POST | `/api/clubs/:id/ideas` | Logged-in student (rate limited) | Suggest an idea to a club (members only; up to 3 waiting per member, 300 characters). The club's leaders get a bell notification. |
| DELETE | `/api/clubs/:id/ideas/:ideaId` | Logged-in student (rate limited) | Remove one idea (its author, the club's leaders or an admin). |
| POST | `/api/clubs` | Admin only | Create a club. |
| PUT | `/api/clubs/:id` | Admin only | Edit a club. |
| DELETE | `/api/clubs/:id` | Admin only | Delete a club along with its memberships and event links. |

## /api/club-memberships

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/club-memberships/my` | Logged-in student | The clubs you have joined. |
| GET | `/api/club-memberships/news` | Logged-in student | The latest news posts (up to 5, last 30 days) from the clubs you have joined. |
| GET | `/api/club-memberships/requests/my` | Logged-in student | The clubs you have asked to join and are still waiting on (clubs that approve their members). |
| POST | `/api/club-memberships/join` | Logged-in student (rate limited) | Join a club; for clubs that approve their members this sends a request instead (answer 202). |
| DELETE | `/api/club-memberships/:clubId` | Logged-in student (rate limited) | Leave a club, or withdraw a request that is still waiting. |

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

## /api/notifications

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/notifications` | Logged-in student | Your latest in-app notifications (newest first) and how many are unread. |
| PUT | `/api/notifications/read-all` | Logged-in student | Mark all of your notifications as read. |

## /api/push

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/push/key` | Logged-in student | The public key a browser needs to turn on phone/browser alerts, or enabled:false when the server isn't set up for them. |
| POST | `/api/push/subscribe` | Logged-in student (rate limited) | Turn on phone/browser alerts for this device (up to 10 devices per student). |
| DELETE | `/api/push/subscribe` | Logged-in student (rate limited) | Turn off phone/browser alerts for one device. |
| POST | `/api/push/test` | Logged-in student (rate limited) | Send a test alert to the logged-in student's own devices. |

## /api/board

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/board` | Logged-in student | The live notice-board posts (lost, found, notices), newest first; optional ?category=lost\|found\|notice. Logged-in students only. |
| POST | `/api/board` | Logged-in student (rate limited) | Post on the notice board (title up to 80, details up to 300, optional contact up to 60). Up to 3 posts per student; each disappears after 14 days. |
| DELETE | `/api/board/:id` | Logged-in student (rate limited) | Remove a notice-board post (its author or an admin; an admin's removal is logged). |
| PATCH | `/api/board/:id/resolve` | Logged-in student (rate limited) | Mark your own lost/found post as resolved; it then disappears in 2 days. |
| POST | `/api/board/:id/report` | Logged-in student (rate limited) | Report a notice-board post to the admins (once per student, not your own). Three reports hide it from students until an admin removes it. |

## /api/certificates

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/api/certificates/verify/:code` | Anyone (rate limited) | Check that a certificate code is genuine (public, no login). |
