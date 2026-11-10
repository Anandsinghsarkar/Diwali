# Enable Passkey / Biometric Login

DiwaliVerse now supports Supabase Auth Passkeys. This uses the browser/Android WebAuthn system prompt; the website never reads or stores fingerprint or face data. Depending on the device and its security settings, the system may verify with fingerprint, face recognition, a device PIN, or another supported screen-lock method.

## Supabase Dashboard setup

1. Open the Supabase project used by DiwaliVerse.
2. Go to **Authentication → Passkeys**.
3. Turn on **Enable Passkey authentication**.
4. Set **Relying Party Display Name** to `DiwaliVerse`.
5. Set **Relying Party ID** to `diwali-ten-self.vercel.app` (domain only; no `https://` or path).
6. Set **Relying Party Origins** to `https://diwali-ten-self.vercel.app`.
7. Save the settings.

If the production website uses a different custom domain, use that exact stable domain as the RP ID and its HTTPS origin instead. Choose carefully: changing the RP ID later invalidates passkeys already registered for the old RP ID. Do not register passkeys against temporary Vercel preview URLs.

## User flow

- Existing users sign in with their current email/password, open **My Profile → Fingerprint / Passkey Login**, and choose **Enable Fingerprint / Passkey**.
- The device/browser opens its genuine WebAuthn system prompt. Complete the prompt to register.
- The login page offers **Login with Fingerprint / Passkey**. The user chooses their saved credential and completes the system verification.
- The profile security section lists registered passkeys and allows renaming or removing them.
- Password login remains available as a recovery option.

## Requirements and notes

- Passkeys require HTTPS (localhost is allowed for local development) and a browser/device that supports WebAuthn.
- Supabase requires a confirmed, non-anonymous account before registering a passkey.
- Supabase Auth stores and verifies the passkey credential. No SQL migration or public fingerprint table is required.
- Passkey support in Supabase JS is currently marked experimental and may change. The app opts in using `auth.experimental.passkey`.
- A passkey is not necessarily fingerprint-only. Android/browser may offer face unlock, device PIN, or another configured verifier. The app cannot force a particular biometric modality from a normal website.
- Keep email/password recovery enabled. Users should register a recovery passkey on another device or use the account recovery flow before removing their only passkey.
