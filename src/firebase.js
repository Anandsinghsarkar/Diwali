import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, signInAnonymously, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { getDatabase, ref, onValue, push, remove, set, onDisconnect, onChildAdded, query, limitToLast } from 'firebase/database'

// Public Firebase Web App configuration for king-cobra-7x.
// These are client-side identifiers, not service-account credentials.
const firebaseConfig = {
  apiKey: 'AIzaSyBMuwvlobU0snYv9Lm3_xf8M7khQN7_0I',
  authDomain: 'king-cobra-7x.firebaseapp.com',
  databaseURL: 'https://king-cobra-7x-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'king-cobra-7x',
  storageBucket: 'king-cobra-7x.firebasestorage.app',
  messagingSenderId: '26893611328',
  appId: '1:26893611328:web:e86cacb5648c7957168aa5',
  measurementId: 'G-PF8QE6DJR0'
}

export const firebaseReady = true

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getDatabase(app, firebaseConfig.databaseURL)

let guestPromise
export const ensureGuest = async () => {
  if (auth.authStateReady) await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser

  if (!guestPromise) {
    guestPromise = (async () => {
      await setPersistence(auth, browserLocalPersistence)
      if (auth.currentUser) return auth.currentUser
      const result = await signInAnonymously(auth)
      return result.user
    })().catch(error => {
      guestPromise = null
      throw error
    })
  }
  return guestPromise
}

export { ref, onValue, push, remove, set, onDisconnect, onChildAdded, query, limitToLast }
