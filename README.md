# SIGCE Canteen App (React + Node + MongoDB)

Student, Teacher and Admin panels for canteen ordering with:
- Role-based login (college email regex for students)
- Google login (restricted to SIGCE emails)
- Token-based orders + real-time TV display screen
- Teacher staff-room delivery + lunch preorder cutoff
- Razorpay payments + cash option
- College-hours (9am–5pm) + canteen-premises (geofence) enforcement

## Prerequisites
- Node.js 18+
- MongoDB (local) **or** Docker

## Quick start (local)
1) Start MongoDB (choose one):
- Local MongoDB running on `mongodb://localhost:27017`
- Or Docker:
```bash
docker compose up -d
```

2) Setup env files:
- Copy `apps/api/.env.example` → `apps/api/.env`
- Copy `apps/web/.env.example` → `apps/web/.env`

3) Install + run:
```bash
npm install
npm run dev
```

Open:
- Web app (Student/Teacher/Admin): `http://localhost:5173`
- API health: `http://localhost:4000/health`
- TV display screen: `http://localhost:5173/display`

## Default admin (seeded)
Set in `apps/api/.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Notes
- Razorpay requires `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` in `apps/api/.env`.
- Google login requires `VITE_GOOGLE_CLIENT_ID` in `apps/web/.env` and `GOOGLE_CLIENT_ID` in `apps/api/.env`.

## College rules (enforced by API)
- **College hours:** 9:00–17:00 (configurable via `COLLEGE_HOURS_START` / `COLLEGE_HOURS_END`)
- **Teacher lunch preorder cutoff:** default **10:30** for staff-room delivery (`TEACHER_LUNCH_PREORDER_CUTOFF`)
- **Canteen premises only:** optional geofence (`ENFORCE_GEOFENCE=true` + `CANTEEN_LAT/LNG/RADIUS`) — set `VITE_ENFORCE_GEOFENCE=true` in the web app so it sends device location.

## Student email regex
Students can register only if their email matches:
- `STUDENT_EMAIL_REGEX` (default: `^\d{4}ci\d{2}f@sigce\.edu\.in$`)
