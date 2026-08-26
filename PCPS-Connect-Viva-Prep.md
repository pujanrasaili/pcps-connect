# PCPS Connect — Viva Prep Guide

---

## 1. The 60-Second Intro (say this first, memorize the shape not the words)

> "My project is **PCPS Connect** — a full MERN stack Club & Event Management
> System for Patan College of Professional Studies. It lets students browse
> clubs, join or favorite them, browse events, register or unregister for
> them, and track everything from a personal dashboard with charts. I built
> it as a real full-stack app — React frontend talking to an Express +
> MongoDB backend over a REST API, with JWT-based authentication using
> httpOnly cookies."

Then pause and let them ask questions — don't keep talking. If they want
more, add:

> "The idea was to solve a real problem: clubs and events at PCPS are
> currently coordinated informally, so I built a single place where
> students can discover what's happening and register in a few clicks,
> and get a dashboard view of their own participation."

---

## 2. Project Workflow (how you'd describe *how* you built it)

Say it roughly in this order — it's a true, defensible sequence:

1. **Planned the data model first** — what is a Club, an Event, a
   Registration, a User? Decided MongoDB was a good fit since these are
   naturally document-shaped, loosely related records.
2. **Built the frontend UI first** with realistic placeholder data, so the
   design and component structure could be worked out independently of the
   backend.
3. **Built the Express + MongoDB backend** — models, then middleware
   (auth), then controllers (business logic), then routes (wiring
   controllers to URLs).
4. **Connected them** — replaced the frontend's placeholder data with real
   `axios` calls to the live API, added loading states, error handling, and
   toast notifications for user feedback.
5. **Tested end-to-end** manually — register, login, join a club, register
   for an event, check it all shows correctly in Dashboard/Profile, confirm
   it survives logout/login (proving it's really saved server-side, not
   just in the browser).

If asked "did you use AI tools" — answer honestly: yes, you used Claude as
a development assistant across many sessions, the same way developers use
Stack Overflow, docs, or pair programming, but **you can explain and defend
every part of the code** — that's the actual bar, not who typed each
character.

---

## 3. PHASE 1 — Frontend Viva

### UI/UX design and implementation
- Design system: Tailwind CSS with a custom theme (indigo/purple brand
  colors matching PCPS's own red/blue crest), consistent spacing, rounded
  cards, dark mode via Tailwind's `class` strategy.
- Responsive: mobile-first grid layouts (`grid-cols-1 sm:grid-cols-2
  lg:grid-cols-3`), a dedicated mobile nav menu, tested at multiple
  breakpoints.
- Motion: scroll-reveal animations (`IntersectionObserver`-based, a custom
  `useInView` hook) and a subtle 3D tilt-on-hover effect on cards — both
  built from scratch with plain CSS transitions, not a heavy animation
  library.

### React concepts used
Say this list out loud, it's genuinely comprehensive:
- **Functional components** everywhere, no class components
- **Props** — e.g. `<ClubCard club={club} onView={setSelectedClub} />`
- **State** — `useState` for forms, modals, toggles
- **Effects** — `useEffect` for data fetching on mount, auth-check on load
- **Context API** — global state without prop-drilling: `AuthContext`,
  `EventsContext`, `ClubsContext`, `RegistrationContext`,
  `ClubMembershipContext`, `ThemeContext`, `ToastContext`
- **Custom hooks** — `useDebounce` (search input), `useLocalStorage`
  (theme persistence), `useTilt` (3D hover effect), `useInView` (scroll
  animation), `useRequireAuth` (redirect-to-login wrapper)
- **Conditional rendering** — loading spinners, empty states, auth-gated UI
- **Lists & keys** — `.map()` over clubs/events with `key={club._id}`

### Components, Props, State, Hooks, Routing
- **Component reusability** — `Button`, `Modal`, `Card` components
  (`ClubCard`, `EventCard`, `StatsCard`), `SearchBar`, `FilterButtons` are
  all shared across multiple pages.
- **React Router** — `BrowserRouter`, nested `<Route>`s, two layouts
  (`MainLayout` for public pages, `DashboardLayout` with a sidebar for
  logged-in pages), `useParams` (event/club detail pages), `useNavigate`
  + `useLocation` (redirect-after-login flow).
- **Protected routes** — a `<ProtectedRoute>` wrapper checks
  `isAuthenticated` and waits for the initial auth check to finish before
  deciding to redirect (important detail: prevents a logged-in user from
  flashing to `/login` on every page refresh).

### Project structure and code organization
```
frontend/src/
 ├── components/   reusable UI pieces
 ├── pages/        one file per route
 ├── context/       global state providers
 ├── hooks/         custom hooks
 ├── routes/        route definitions + ProtectedRoute
 ├── services/      api.js — central axios client
 └── utils/         small helpers (date formatting, icon mapping)
```
Talking point: **separation of concerns** — pages don't know how data is
fetched, they just call `useEvents()`/`useClubs()`; contexts don't know
about UI; `services/api.js` is the single place that knows the backend's
base URL and auth cookie config.

### Responsiveness and user experience
- Toast notifications on every action (login, register, join/leave club,
  favorite, register/unregister for an event) — no silent failures.
- Empty states, loading spinners, and disabled buttons during submission
  so users always know what's happening.
- Search is debounced (waits 250ms after typing stops) so it doesn't
  re-filter on every keystroke.

---

## 4. PHASE 2 — Backend & Integration Viva

### Backend architecture
Layered structure, each layer with one job:
```
backend/
 ├── models/        Mongoose schemas (data shape + validation)
 ├── middleware/     auth checks, file upload config
 ├── controllers/   business logic (what happens on each request)
 ├── routes/         URL → controller wiring
 └── index.js        Express app setup, CORS, error handling
```
Talking point: a request flows **route → middleware → controller → model
→ database**, and back. This is the standard MVC-ish pattern for Express
apps.

### API development and endpoints
Resources: `/api/auth`, `/api/events`, `/api/clubs`, `/api/registrations`,
`/api/club-memberships`, `/api/admin`. RESTful conventions: `GET` to read,
`POST` to create, `PUT` to update, `DELETE` to remove.

Know these cold, they're the heart of the app:
- `POST /api/auth/register`, `POST /api/auth/login` — auth
- `GET /api/events`, `GET /api/events/:id` — public, no login needed
- `POST /api/registrations/register` — protected, needs login
- `GET /api/admin/users` — protected AND needs `role === "admin"`

### Database design and operations
Four main collections:
- **User** — name, email, hashed password, role, profile fields
- **Club** — name, category, description, activities
- **Event** — title, date, location, capacity, category, price
- **Registration** / **ClubMembership** — join tables linking a User to
  an Event/Club

Talking point on **relationships**: MongoDB is NoSQL, so instead of SQL
foreign keys, you reference other documents by `ObjectId` and use
Mongoose's `.populate()` to fetch the related data — e.g. an event's
`createdBy` field stores a User's `_id`, and `.populate("createdBy",
"name email")` fetches just those two fields from that user when you
query the event.

Talking point on **live counts, not stored counters**: registration counts
per event are computed live via a MongoDB aggregation
(`Registration.aggregate(...)` grouping by event), not a manually
incremented number — so it can never drift out of sync with reality.

### Authentication and authorization
This is your strongest, most detailed answer — walk through it slowly:
1. **Password hashing**: `bcrypt.hash()` on register — passwords are never
   stored in plain text.
2. **Login**: compares the submitted password with the hash
   (`bcrypt.compare`), and if it matches, signs a **JWT** containing the
   user's ID.
3. **Cookie, not localStorage**: that JWT is sent back as an `httpOnly`
   cookie — meaning JavaScript in the browser *cannot read it*, which
   protects against XSS token theft. This is more secure than the common
   "store the token in localStorage" pattern.
4. **Every subsequent request** automatically includes that cookie
   (`credentials: "include"` on the frontend, `cors({ credentials: true
   })` on the backend to allow it cross-origin).
5. **`protect` middleware** reads the cookie, verifies the JWT, loads the
   user, and attaches it to `req.user` — any route wrapped in `protect`
   requires a valid login.
6. **`adminOnly` middleware** runs *after* `protect` and checks
   `req.user.role === "admin"`, returning `403 Forbidden` otherwise — this
   is **role-based authorization**, distinct from authentication (are you
   logged in vs. are you allowed to do this).
7. **Ownership checks**: e.g. you can only edit/delete an event if you
   created it, *or* you're an admin — enforced in the controller by
   comparing `event.createdBy` to `req.user._id`.

### Frontend and backend integration
- Central `services/api.js` — one `axios` instance with `withCredentials:
  true` so the auth cookie is always sent, used by every context.
- **The tricky part, worth mentioning**: since the JWT lives in an
  `httpOnly` cookie, the frontend *cannot* just check "is there a token in
  localStorage" to know if someone's logged in. Instead, on every page
  load, it calls `GET /api/auth/me` — if that succeeds, they're logged in;
  if it 401s, they're not. This is the standard pattern for cookie-based
  auth.
- CORS had to be explicitly configured (`origin: "http://localhost:5173",
  credentials: true`) or the browser silently blocks the cookie from being
  sent cross-origin (frontend on port 5173, backend on port 5000 — two
  different origins as far as the browser's concerned).

### Error handling, validation, and deployment process
- Every controller wraps logic in `try/catch` and returns a consistent
  `{ message: "..." }` shape on error, with the right HTTP status code
  (400 bad input, 401 not logged in, 403 not allowed, 404 not found, 500
  server error).
- Basic input validation in controllers (required fields checked before
  hitting the database) and in the frontend forms (client-side validation
  before the request is even sent, for fast feedback).
- A central Express error-handling middleware catches anything uncaught
  (e.g. file upload errors from Multer) so the server never crashes on a
  bad request.
- **Deployment**: currently run locally (`localhost:5000` /
  `localhost:5173`) with MongoDB Atlas as the cloud-hosted database — so
  the database layer is already "deployed" in the sense that it's a real
  cloud service, not a local Mongo install. If asked "would you deploy
  this," honest answer: yes — frontend to something like Vercel/Netlify,
  backend to something like Render/Railway, both pointing at the same
  Atlas cluster.

---

## 5. Questions you should have a ready answer for

**"Why MongoDB over SQL?"**
Club/event data is naturally document-shaped and doesn't need complex
joins — a good fit for MongoDB's flexible schema, and Mongoose gives
schema validation on top so you still get structure.

**"Why JWT in a cookie instead of localStorage?"**
Security — `httpOnly` cookies can't be read by JavaScript, so they're not
vulnerable to XSS attacks stealing the token the way localStorage tokens
are.

**"What would you improve given more time?"**
Be honest and specific — this shows self-awareness, which is a good look:
- An admin dashboard UI (the role-protected API for it already exists,
  just no frontend page yet)
- Pagination for clubs/events (not needed yet at this data size, but
  would matter at scale)
- Email notifications for event reminders

**"Walk me through what happens when I click 'Join Club'."**
Frontend calls `toggleJoin(clubId)` → `POST /api/club-memberships/join`
with the cookie attached → backend's `protect` middleware verifies the
JWT → controller checks the club exists and isn't already joined →
creates a `ClubMembership` document → frontend re-fetches the membership
list → UI updates, toast shows "Joined club!".

---

## 6. Night-before / morning-of checklist

- [ ] Confirm the GitHub link is actually submitted in Google Classroom
- [ ] Sleep — seriously, this matters more than more reading
- [ ] Before you leave: make sure both servers still start cleanly
      (`npm run dev` in both `backend/` and `frontend/`)
- [ ] Have MongoDB Atlas → Network Access set to `0.0.0.0/0` so it
      connects from any network (venue wifi included)
- [ ] Skim this doc once more over breakfast, not during the viva