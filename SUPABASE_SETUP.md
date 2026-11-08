# Supabase setup for DiwaliVerse

The app no longer uses Firebase. The Live Together experience uses Supabase Auth, Postgres, Realtime Presence, Realtime Postgres Changes, and RPC functions.

## 1. Create the database

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Open this repository's `supabase/schema.sql`, paste the complete file, and run it once.
4. In **Authentication → Providers**, enable **Anonymous** sign-ins.

The SQL creates the room, member, room-state, and room-event tables, enables RLS, adds room-capacity checks, and configures the Realtime publication.

## 2. Add Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

- `VITE_SUPABASE_URL` — your Supabase Project URL.
- `VITE_SUPABASE_ANON_KEY` — your Supabase publishable key (or legacy anon key).

Add them for the environments you deploy (Production, Preview, and Development as needed), then redeploy.

**Never use the Supabase service-role/secret key in Vercel frontend variables or browser code.** The publishable/anon key is designed for client use; access is controlled by the SQL Row Level Security policies.

## 3. What is stored

- `rooms`: Friends / Couple room and owner.
- `room_members`: participant name and display hue.
- `room_state`: diya totals, race state, race scores, Rangoli reset epoch.
- `room_events`: chat messages, shared Rangoli strokes, and fireworks events.

Room codes, room limits (2 for Couple and 12 for Friends), persistent anonymous sessions, online presence, typing indicators, chat, diya scoreboard, race, Rangoli, and shared fireworks are handled by the Supabase adapter.
