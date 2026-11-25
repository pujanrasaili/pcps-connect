# Performance and load

How much traffic PCPS Connect handles, what limits it, and what to do as it grows. The numbers below were measured on a two-core test machine with a local database, so treat them as a comparison between versions, not as a promise for your hosting plan.

## What a college needs

A few thousand students, most of them opening the app a few times a day. The busy moments are short and shared: orientation, the day registration opens for a popular event, or a poster's QR code being scanned by a whole hall at once. That means a few hundred people arriving within a minute, not constant heavy traffic.

## Measured results

Plain requests, 100 people at once for 15 seconds:

| Page data | Requests per second | Typical wait (median) |
|---|---|---|
| Health check (no database) | about 6,000 | 15 ms |
| Club list (one database read) | about 600 | 150 ms |
| Public statistics (database reads) | about 600 | 150 ms |

At 600 requests per second the server could answer over 50 million requests a day, far more than a college sends. A hosting plan with less CPU will be slower, but the order of magnitude leaves a lot of room.

## The one real bottleneck, now fixed

Logging in is deliberately slow work (the server scrambles the password so a stolen database is useless). The old code did that work in JavaScript on the same thread that answers every other request, so while a group of people logged in, **everyone else's page loads waited**.

Thirty people logging in at once, while 20 others browsed:

| | Logins per second | Browsing, median wait | Browsing, slowest |
|---|---|---|---|
| Before (JavaScript hashing) | 13 | 4,303 ms | 5,705 ms |
| Native hashing | 28 | 1,886 ms | 2,003 ms |
| Native hashing, 2 at a time (now) | 16 | 79 ms | 314 ms |

Logins are still fast (a single login takes well under a second), and browsing stays responsive during a rush. Every password already stored keeps working, because the two hashing libraries read and write the same format (`utils/__tests__/password.test.js` checks both directions). If the faster native library can't be installed on some machine, the app falls back to the old one automatically.

`PASSWORD_HASH_CONCURRENCY` (default 2) sets how many passwords are worked on at once. Leave it alone unless your host has many CPU cores.

## How the rest of the code holds up

- **Lists are bounded.** The public event list only sends upcoming events and the last 90 days; the full history is opt-in (`?scope=all`). Notifications and the audit log are limited. Event details and counts use one batched query, not one per event.
- **Indexes cover the busy queries** (registrations by event and by person, club members, notifications, events by date). Collections without an index (users, clubs) are small.
- **Replies are compressed** and large lists shrink to a fraction of their size.
- **Rate limits protect login, sign-up and password guessing**, counting only wrong attempts so a whole campus behind one Wi-Fi address is not locked out.
- **Scheduled work runs outside the server** (GitHub Actions call it), so reminders, the weekly digest and clean-up never compete with students for the server's attention.
- **Uploads** are limited to 5 MB and held in memory while they are sent to Cloudinary. A handful at once is fine; hundreds of simultaneous uploads are not something this app expects (only organisers upload).

## Connections and timeouts

The server keeps at most 10 MongoDB connections open (`MONGO_POOL_SIZE`), well inside the free Atlas limit of 500, and fails fast after 10 seconds if the database cannot be reached. Idle connections are kept open for 65 seconds, longer than Render's proxy, so the first request after a quiet moment is not sent down a connection that has just been closed.

## What will limit you first

1. **The server going to sleep.** On a free plan the first visit after a quiet period waits for the server to wake. The keep-warm workflow (see `docs/HANDOVER.md`) prevents this during the day.
2. **The hosting plan's CPU and memory.** Free plans share a small slice of a CPU. If pages get slow at busy moments, upgrading the backend plan is the first and cheapest fix.
3. **The database tier.** Free database tiers limit connections and throughput. Watch the usage chart in MongoDB Atlas; upgrade the tier if it stays near its limit.

Nothing in the code needs to change for more traffic, because the server keeps no data in its own memory that other copies would need (the one exception is the rate-limit counters, which is fine for one server). If you ever run several copies of the backend, move those counters to a shared store first.

## Repeat the tests

Start the backend on your own computer against a test database, then:

```
npx autocannon -c 100 -d 15 http://localhost:5000/api/clubs
```

For the login rush (needs an existing verified, approved account; it only runs against localhost):

```
cd backend
BASE=http://localhost:5000 EMAIL=you@example.com PASSWORD='your password' node scripts/loginRushTest.mjs
```

Never run either test against the live site.
