# SIGCE Canteen App

React + Node.js + MongoDB app with Student, Teacher, and Admin panels.

## Features
- Student and teacher ordering with live token queue
- Teacher lunch preorder with staff-room delivery cutoff
- College-hours and optional geofence enforcement
- Cash and Razorpay online payment
- Google login and email/password login
- Teacher-assigned reward points for students
- Student point redemption for canteen discount during checkout
- PWA install support and mobile packaging support (Capacitor Android)

## Project structure
- `apps/api` = Express + MongoDB backend
- `apps/web` = React web app (PWA)

## Local setup
1. Copy env templates:
```bash
copy apps\api\.env.example apps\api\.env
copy apps\web\.env.example apps\web\.env
```
2. Start MongoDB (choose one):
- Local MongoDB service, or
- Docker:
```bash
docker compose up -d
```
3. Install and run:
```bash
npm install
npm run dev
```
4. Open:
- App: `http://localhost:5173`
- API health: `http://localhost:4000/health`

## Reward points rule
- Teachers assign points from Teacher panel.
- Students redeem points in Student cart.
- Discount formula (configurable):
- `POINTS_PER_RUPEE_DISCOUNT=10` means 10 points gives Rs 1 discount.

## Mobile app path
This project now supports Android packaging via Capacitor.

1. One-time Android project creation:
```bash
npm run mobile:add-android -w apps/web
```
2. Build and sync Android project:
```bash
npm run mobile:sync -w apps/web
```
3. Open Android Studio project:
```bash
npm run mobile:android -w apps/web
```
4. In Android Studio:
- Build APK/AAB
- Install on device or publish via Play Console

Important:
- For mobile app builds, set `VITE_API_BASE` in `apps/web/.env` to your deployed HTTPS API URL.
- Do not keep it empty for APK builds because Vite dev proxy is not used inside mobile app runtime.
