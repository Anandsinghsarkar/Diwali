import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getDatabase, ref, onValue, push, remove, set } from 'firebase/database'

// Vite exposes only VITE_* variables to browser code. These values are public
// Firebase web-app configuration, not admin credentials or service-account keys.
const env = import.meta.env
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: env.VITE_FIREBASE_APP_ID || ''
}

export const firebaseReady = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.databaseURL &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

const app = firebaseReady
  ? (getApps().length ? getApp() : initializeApp(firebaseConfig))
  : null

export const auth = app ? getAuth(app) : null
export const db = app ? getDatabase(app, firebaseConfig.databaseURL) : null

let guestPromise
export const ensureGuest = () => {
  if (!auth) return Promise.reject(new Error('Firebase config missing. Add the VITE_FIREBASE_* variables in Vercel and redeploy.'))
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  if (!guestPromise) {
    guestPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => auth.currentUser || signInAnonymously(auth).then(result => result.user))
      .catch(error => { guestPromise = null; throw error })
  }
  return guestPromise
}

export { ref, onValue, push, remove, set }
