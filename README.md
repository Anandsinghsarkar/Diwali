# 🪔 DiwaliVerse — Advanced Android-Friendly Diwali Website

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

## Advanced / Unique Features (New)

### Diya World (Next-level)
- **Hyper-realistic multi-layer flames** with natural sway and wind influence
- **Mic Blow-to-Extinguish**: Enable the mic button and blow into your phone/laptop mic to extinguish the latest diya (real breath detection via Web Audio)
- **Device Tilt Wind**: Tilt your phone — flames lean with the wind and smoke drifts accordingly
- Richer embers, smoke and ambient glow
- Multiple flame styles: Natural, Rainbow, Blue, Pink, Green, Violet

### Rangoli Studio
- **Living Glow Mode**: Soft pulsing golden light over the entire rangoli that feels alive
- High-quality powder simulation with shadow + highlight grains
- 4 / 6 / 8 / 12-fold symmetry + mirror
- Auto-pour mandala, eraser, PNG download
- Corner diyas that light up as the room’s total diyas grow

### Night Sky / Crackers
- **Multi-Break shells** — primary burst followed by secondary smaller explosions
- **Haptic feedback** on mobile for heavy crackers (bomb, multi-break, ladi)
- Classic shells: Peony, Chrysanthemum, Willow, Ring, Heart, Crackle, Palm
- Ground crackers: Anar, Chakri, Ladi, Atom bomb, Phuljhadi (sparkler)
- Auto show + Grand Finale
- Realistic sound design with Web Audio + screen shake

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
   - `supabase/individual_diya.sql` (enables one-by-one diya extinguishing and rainbow flame styles)
   - If you encounter the `room_members` RLS 42501 error, run `supabase/fix_room_members_rls.sql`.
4. Configure these environment variables in your local `.env` and Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Only use the Supabase publishable/anon key in the browser. Never expose a `service_role` key or secret key in frontend code.

## Fingerprint / Passkey login

See [PASSKEY_SETUP.md](./PASSKEY_SETUP.md) to enable real WebAuthn passkeys in Supabase Authentication. Passkeys use the device/browser's secure verification prompt; the website does not access biometric data.

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

React · Vite · CSS · Canvas 2D · Web Audio API · Device Orientation · MediaDevices (mic) · Supabase Auth · Supabase Database · Supabase Realtime

---

Made with ✨ for the Festival of Lights.
