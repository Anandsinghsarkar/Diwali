# 🪔 DiwaliVerse — Experience the Magic of Lights

A responsive, interactive Diwali celebration website built with React and Vite. Designed to run as a static frontend on Vercel with no required login, database, paid API, or environment variables.

## Features

- **Magical home page** with festive hero art, floating effects, and a Diwali countdown.
- **Interactive fireworks canvas** with tap-to-burst effects, automatic show controls, Classic / Sparkler / Grand Finale styles, color choices, and browser-synthesized sound effects.
- **Virtual Diya World** — light individual diyas, light all, or turn them off.
- **Rangoli Studio** — freehand drawing, color palette, brush size, clear, and PNG download.
- **Virtual Home Decorator** — toggle fairy lights, flowers, diyas, toran, lanterns, and stars.
- **Greeting Card Maker** — personalize a greeting, choose a theme, download as PNG, and share.
- **Festive Photo Booth** — local photo preview, festive filters, frame choices, and PNG download. Photos are not uploaded.
- **Diwali Quiz** — an expanded festival quiz with score tracking and restart.
- **Music & Sound** — locally synthesized ambient tones and fireworks effects using the Web Audio API.
- **Celebration Wall** — post wishes saved locally in the current browser.
- **Stories & Traditions** — a short introduction to Diwali customs.
- **Interactive Night Sky** — a starry scene where visitors can release a personal wish.
- **Surprise Zone** — reveal randomized festive messages and blessings.
- **Magic cursor trail** — subtle sparkle particles on pointer devices.
- **Festive themes** — switch between gold, rose, and emerald accent palettes.
- **Fullscreen mode** — expand the celebration experience.

## Run locally

```bash
npm install
npm run dev
```

Create a production build:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

1. Import this GitHub repository in Vercel.
2. Keep the project root directory as the repository root.
3. Vercel should detect **Vite** automatically.
4. Build command: `npm run build`
5. Output directory: `dist`
6. No environment variables are required.

Every push to the connected production branch can trigger a new Vercel deployment.

## Notes

- Browser audio generally requires a visitor gesture before playback. The sound toggle and music play button provide that gesture.
- Fireworks are visual animations; no real fireworks or physical devices are involved.
- Celebration Wall wishes are stored in local browser storage and are not a globally synchronized public feed. Night Sky wishes are visual-only and are not sent to a server.
- Photo processing and greeting/rangoli downloads happen client-side.

## Tech

React · Vite · CSS · Canvas 2D · Web Audio API · Lucide React

---
Made with ✨ for the Festival of Lights.


## Firebase Live Together

Live rooms use Firebase Realtime Database and Firebase Anonymous Authentication. The browser Firebase config is read from Vercel build-time environment variables; no Firebase Admin SDK or service-account key belongs in the frontend.

### Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables** (Production, Preview and Development as needed), then trigger a new deployment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Use the values from Firebase Console → Project settings → General → Your apps (Web app), and the exact Realtime Database URL from Realtime Database. Vite embeds `VITE_*` values during the build, so changing them requires a fresh Vercel deployment.

### Firebase Console setup

1. In Firebase Console → Authentication → Sign-in method, enable **Anonymous**.
2. Create or open the Realtime Database in the same Firebase project.
3. Open Realtime Database → Rules, paste the repository's `database.rules.json`, and Publish.
4. Confirm the database URL in `VITE_FIREBASE_DATABASE_URL` matches that database's URL.

### Rooms

- Friends rooms generate a `FRIEND-XXXXXXXX` code.
- Love rooms generate a `LOVE-XXXXXXXX` code and use the two-person/couple presentation.
- Share the room code or the generated invite link. A recipient can open the invite link or enter the same code and choose the matching room type.
- Firebase chat and shared diya state sync through Realtime Database without a separate WebSocket server.
- The participant roster, rangoli drawing and shared fireworks effects still use the optional WebSocket server. Set `VITE_WS_URL` to its secure WebSocket URL for those features.

Firebase web configuration is public by design; database rules and Firebase Authentication protect access. Never put a service-account JSON, private key, or Firebase Admin credential in a `VITE_*` variable.
