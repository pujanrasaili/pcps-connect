# PCPS Connect — Frontend

React + Vite client for PCPS Connect. This is the UI layer for a full
MERN-stack app — it talks to a real Express/MongoDB backend over the
`/api` routes documented in `../backend/README.md`; there is no mock data
or `localStorage`-only mode here.

See the root `README.md` for the full project overview, features, and
combined setup instructions (backend + frontend together). This file
covers frontend-specific details only.

## Tech stack

- React 19, React Router v7
- Tailwind CSS 3 (dark mode via the `class` strategy)
- Recharts (dashboard charts)
- Axios (API client, `src/services/api.js`)
- Vite (build tool)

## Project structure

```
src/
 ├── assets/images/     PCPS branding + stock campus photography
 ├── components/        Navbar, Footer, HeroSection, ClubCard, EventCard,
 │                       StatsCard, SearchBar, FilterButtons, Sidebar,
 │                       Button, Modal, ConfirmDialog, AttendeesModal,
 │                       RegistrationForm, Pagination, Reveal,
 │                       VideoLightbox, ErrorBoundary, ScrollToTop
 ├── pages/              One file per route, plus pages/admin/ for the
 │                       admin panel (AdminOverview, AdminClubs,
 │                       AdminEvents, AdminUsers)
 ├── hooks/              useDebounce, usePagination, useInView, useTilt,
 │                       useLocalStorage, useRequireAuth
 ├── services/           api.js — the real Axios client + resolveUploadUrl
 ├── utils/              formatDate (isUpcoming/isPastEvent), iconMap
 ├── routes/             AppRoutes (route-level code splitting)
 ├── context/            AuthContext, EventsContext, ClubsContext,
 │                       ClubMembershipContext, RegistrationContext,
 │                       ThemeContext, ToastContext
 ├── App.jsx
 └── main.jsx
```

## Getting started

```bash
npm install
cp .env.example .env   # points VITE_API_URL at your running backend
npm run dev
```

Needs the backend running too (see `../backend/README.md` or the root
`README.md`) — this app has no working offline/demo mode; every page
that shows real data (clubs, events, auth, dashboard) is reading from the
live API.

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## Notes

- Authentication is real: accounts require a `@patancollege.edu.np`
  email, email verification, and admin approval before login works — see
  the root README's Features section.
- Dark mode and the signed-in session persist across reloads, but as a
  *preference*/*cookie*, not as the source of truth for app data — all
  club/event/registration data always comes from the API.
