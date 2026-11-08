import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { getDatabase, ref, onValue, push, remove, set } from 'firebase/database'
const firebaseConfig = {
  apiKey: "AIzaSyBMuwvlobU0snYv9Lm3_xf8M7khQN7_0I",
  authDomain: "king-cobra-7x.firebaseapp.com",
  databaseURL: "https://king-cobra-7x-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "king-cobra-7x",
  storageBucket: "king-cobra-7x.firebasestorage.app",
  messagingSenderId: "26893611328",
  appId: "1:26893611328:web:f5d7aa7894c638f1168aa5",
  measurementId: "G-0MYGPKL94N"
}
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
export const db = getDatabase(app)
export const ensureGuest = () => auth.currentUser ? Promise.resolve(auth.currentUser) : signInAnonymously(auth).then(result => result.user)
export { ref, onValue, push, remove, set }
