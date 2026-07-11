# PCPS Connect — Club & Event Management System

A modern, responsive web application built for **Patan College of Professional Studies (PCPS)** that lets students explore clubs, discover events, register in a few clicks, and track their participation from a personal dashboard.

Built as a university final-year assignment to demonstrate professional React architecture, component reusability, and modern UI/UX practices.

![Tech](https://img.shields.io/badge/React-18-4F46E5) ![Tech](https://img.shields.io/badge/Tailwind-3-7C3AED) ![Tech](https://img.shields.io/badge/Vite-8-646CFF)

---

## ✨ Features

- **12 fully built pages** — Home, Clubs, Events, Event Details, Dashboard, Profile, Contact, Settings, Login, Register, Forgot Password, 404
- **Authentication UI** with client-side validation (login, register, forgot password) — session persisted to `localStorage`
- **Protected routes** — Dashboard, Profile, and Settings require login
- **Event registration** with a real form, validation, capacity tracking, and `localStorage` persistence so registrations survive a refresh
- **Interactive dashboard** with Recharts (bar chart of participation by month, pie chart of events by category) and animated stat cards
- **Search & filter** on both Clubs and Events pages (debounced search input)
- **Dark mode** with a persisted theme toggle, applied via Tailwind's `class` strategy
- **Fully responsive** — mobile, tablet, laptop, desktop, with a dedicated mobile navigation menu
- **Club detail modal** with activities, club lead, and contact info
- **Notification preferences** and account settings (UI layer, persisted locally)
- Built with official **PCPS branding** — crest and wordmark logos, "Learn to Lead" identity

## 🛠 Tech Stack

- React 18 (functional components + hooks)
- React Router v6
- Tailwind CSS 3 (dark mode via `class`, custom design tokens)
- Recharts (dashboard charts)
- React Icons
- Vite (build tool)

## 📁 Project Structure

```
src/
 ├── assets/images/       # PCPS logo & crest
 ├── components/          # Navbar, Footer, HeroSection, ClubCard, EventCard,
 │                         # StatsCard, SearchBar, FilterButtons, Sidebar,
 │                         # Button, Modal, RegistrationForm, ScrollToTop
 ├── layouts/              # MainLayout (public pages), DashboardLayout (sidebar pages)
 ├── pages/                # One file per route
 ├── hooks/                # useLocalStorage, useDebounce
 ├── services/             # clubService, eventService (mock async API layer)
 ├── utils/                # formatDate helpers
 ├── routes/               # AppRoutes, ProtectedRoute
 ├── data/                 # clubs.js, events.js (sample data)
 ├── context/              # ThemeContext, AuthContext, RegistrationContext
 ├── App.jsx
 └── main.jsx
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
# http://localhost:5173
```

### Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

## 🔐 Demo Login

This is a UI-only authentication system (no backend). You can:
- **Register** a new account with any name/email — it logs you in immediately.
- **Log in** with any email + a password of 6+ characters — a demo student profile is created.

All session and registration data is stored in your browser's `localStorage`, so it persists across refreshes but is local to your device.

## 🎨 Design System

| Token | Value |
|---|---|
| Primary | Indigo `#4F46E5` |
| Secondary | Purple `#7C3AED` |
| Background | Slate / White (Slate 950 in dark mode) |
| Display font | Poppins |
| Body font | Inter |
| Radius | `xl` / `2xl` rounded corners |
| Shadows | Soft, layered card shadows |

## 📊 React Concepts Demonstrated

- Functional components & props
- `useState`, `useEffect`, custom hooks (`useDebounce`, `useLocalStorage`)
- React Router v6 (nested routes, protected routes, `useParams`, `useNavigate`, `useLocation`)
- Context API for global state (theme, auth, registrations)
- Conditional rendering, list rendering with `.map()`
- Controlled form handling & client-side validation
- Component composition & reusability

## 📌 Notes

- Club/event photography is sourced from Unsplash for demo purposes; replace with real PCPS photography before any real deployment.
- Authentication, contact form submission, and account settings are UI-only — wire them up to a real backend/API before production use.

---

Built with ❤️ for PCPS — **Learn to Lead.**
