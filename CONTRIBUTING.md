# Contributing to PCPS Connect

Thanks for helping. This is a small MERN app (React + Vite frontend, Express + MongoDB backend), so setting it up takes a few minutes.

## Run it locally

```
# backend (needs a MongoDB connection string in backend/.env, see backend/.env.example)
cd backend
npm ci
npm run dev

# frontend (see frontend/.env.example for the API address)
cd frontend
npm ci
npm run dev
```

`npm run seed` in `backend` fills the database with sample clubs and events. `npm run make-admin` turns an existing account into an admin.

## Before you open a pull request

Run the checks that CI runs:

```
cd backend  && npm run lint && npm test
cd frontend && npm run lint && npm test && npm run build
cd frontend && npm run e2e        # browser tests, about 10 minutes
```

- The browser tests use a mocked API, so they need no database.
- A new screen or feature should come with a test. The browser tests in `frontend/e2e` cover English and Nepali and run an accessibility check on every page they open.
- If you add or change an API route, add a line to `DESCRIPTIONS` in `backend/scripts/generateApiDocs.js` and run `npm run docs:api` in `backend`. A test fails if `docs/API.md` is out of date.
- New text shown to students goes through `t("...")`. Add a Nepali version to `frontend/src/i18n/ne.js`; mark drafts for review.

## Commits

Keep each commit to one logical change, with a short message that says what changed ("Warn when two events overlap", not "updates"). Several small commits are easier to review than one large one.

## Where things are

- `docs/HOW_IT_WORKS.md`: a plain-language tour of the app.
- `docs/ADMIN_GUIDE.md`: for admins and club leaders.
- `docs/API.md`: every API route (generated).
- `docs/LIVE_CHECKLIST.md`: what to check after a release.
