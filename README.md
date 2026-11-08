# 🪔 DiwaliVerse — Android-Friendly Diwali Website

DiwaliVerse is a responsive, mobile-first Diwali celebration website built with React and Vite. It runs directly in Chrome and other Android browsers — no APK or app installation is required.

## Website features

- Festive Diwali home page, countdown and animations.
- Interactive digital fireworks and virtual crackers simulations.
- Virtual Diya World and Rangoli Studio.
- Home decorator, greeting-card maker and photo booth.
- Games, music, Celebration Wall, traditions, Night Sky and Surprise Zone.
- Register/login required before opening the home page or live rooms.
- Discover registered users and send/accept/decline connection requests.
- Shared private Diya rooms with realtime presence, chat and activities.
- Supabase Auth session persistence until logout.

## Android phone experience

The website is optimized for Android mobile browsers:

- Responsive layouts for small and large phone screens.
- Touch-friendly buttons and controls.
- Mobile navigation and compact card layouts.
- Safe-area spacing for modern edge-to-edge screens.
- Responsive live room, chat, login and connection screens.
- No separate APK, Android Studio, or app installation is needed.

### Open on Android

1. Open the deployed website in Chrome on your Android phone.
2. Register or log in.
3. Use the website normally; the layout adapts to the phone screen.
4. Optional: Chrome menu → **Add to Home screen** to create a home-screen shortcut.

## Supabase setup

1. Open your Supabase project.
2. In **Authentication → Providers**, enable Email/Password sign-in.
3. In **SQL Editor**, run these files in order:
   - `supabase/schema.sql`
   - `supabase/social_connections.sql`
   - `supabase/partner_diya.sql` (enables partner diya controls in Couple rooms)
   - If you encounter the `room_members` RLS 42501 error, run `supabase/fix_room_members_rls.sql`.
4. Configure these environment variables in your local `.env` and Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Only use the Supabase publishable/anon key in the browser. Never expose a `service_role` key or secret key in frontend code.

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Deploy the website

Import this repository into Vercel:

- Framework preset: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Tech stack

React · Vite · CSS · Canvas 2D · Web Audio API · Supabase Auth · Supabase Database · Supabase Realtime

---

Made with ✨ for the Festival of Lights.
