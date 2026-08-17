\# PCPS Connect — Club \& Event Management System



A full MERN stack web application built for Patan College of Professional

Studies (PCPS), letting students explore clubs, discover events, register

in a few clicks, and track their participation from a personal dashboard.



Built as an individual MERN Stack assignment.



\## Tech Stack



\*\*Frontend:\*\* React 18, React Router, Tailwind CSS, Axios, Recharts, React Icons

\*\*Backend:\*\* Node.js, Express, MongoDB (Mongoose), JWT authentication (httpOnly cookies), Multer (file uploads), bcrypt



\## Project Structure
pcps-connect/

├── frontend/ React + Vite + Tailwind client

└── backend/ Express + MongoDB API server

## Features



\- JWT-based authentication with httpOnly cookies (register, login, logout, session persistence)

\- Full club directory: browse, search, filter by category, join/leave, favorite

\- Full event directory: browse, search, filter, register/unregister, live capacity tracking

\- Personal dashboard with participation charts (Recharts), registered events, and joined clubs

\- Editable student profile

\- Role-based authorization (student vs admin) enforced on protected API routes

\- Toast notifications for every user action

\- Fully responsive, dark mode support



\## Getting Started



\### Backend

```bash

cd backend

npm install

cp .env.example .env   # fill in MONGO\_URI, JWT\_SECRET, etc.

npm run dev

```



\### Frontend

```bash

cd frontend

npm install

cp .env.example .env

npm run dev

```



Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.



\## Future Improvements



\- Admin dashboard UI (the role-protected admin API already exists)

\- Pagination for clubs/events at larger scale

\- Email notifications for event reminders

