/* Mobile-first single-file React app for "Hilmi Yumni". Features:

Email/password signup & login via Firebase Auth

Upload photos (mobile camera / gallery) to Firebase Storage

Gallery browsable by everyone

Simple responsive UI using Tailwind CSS


Setup steps (brief):

1. Create a Firebase project at https://console.firebase.google.com


2. Enable Authentication -> Email/Password


3. Enable Firestore (in test mode for now) and Storage


4. Copy your Firebase config and replace the placeholder below (FIREBASE_CONFIG)


5. Run locally with a React toolchain (Create React App, Vite, Next.js). This file is a single React component you can drop into src/App.jsx of a Vite or CRA project.


6. Deploy to Vercel/Netlify for public access; add environment variables for FIREBASE config if desired.



Notes:

This file assumes Tailwind is available. If you don't have Tailwind, the app still works but styling will be basic. For quick start, create a Vite + React + Tailwind template.

Replace the firebaseConfig placeholder with your config. Do NOT commit secrets publicly.


*/

import React, { useEffect, useState } from 'react' import { initializeApp } from 'firebase/app' import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth' import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore' import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'

// === REPLACE with your Firebase config === const firebaseConfig = { apiKey: "REPLACE_API_KEY", authDomain: "REPLACE_AUTH_DOMAIN", projectId: "REPLACE_PROJECT_ID", storageBucket: "REPLACE_STORAGE_BUCKET", messagingSenderId: "REPLACE_SENDER_ID", appId: "REPLACE_APP_ID" } // =========================================

const app = initializeApp(firebaseConfig) const auth = getAuth(app) const db = getFirestore(app) const storage = getStorage(app)

export default function App() { const [user, setUser] = useState(null) const [loadingUser, setLoadingUser] = useState(true) const [email, setEmail] = useState('') const [password, setPassword] = useState('') const [uploading, setUploading] = useState(false) const [progress, setProgress] = useState(0) const [photos, setPhotos] = useState([]) const [error, setError] = useState('')

useEffect(() => { const unsub = onAuthStateChanged(auth, (u) => { setUser(u) setLoadingUser(false) }) return () => unsub() }, [])

useEffect(() => { // realtime gallery from Firestore const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc')) const unsub = onSnapshot(q, (snap) => { const arr = [] snap.forEach(doc => arr.push({ id: doc.id, ...doc.data() })) setPhotos(arr) }, (err) => console.error('err', err)) return () => unsub() }, [])

async function handleSignup(e) { e.preventDefault() setError('') try { await createUserWithEmailAndPassword(auth, email, password) setEmail('') setPassword('') } catch (err) { setError(err.message) } }

async function handleLogin(e) { e.preventDefault() setError('') try { await signInWithEmailAndPassword(auth, email, password) setEmail('') setPassword('') } catch (err) { setError(err.message) } }

async function handleLogout() { await signOut(auth) }

async function handleFileChange(e) { const file = e.target.files[0] if (!file) return setError('') setUploading(true) try { const uid = user ? user.uid : 'anonymous' const name = ${uid}_${Date.now()}_${file.name} const sRef = storageRef(storage, photos/${name}) const uploadTask = uploadBytesResumable(sRef, file) uploadTask.on('state_changed', (snapshot) => { const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100 setProgress(Math.round(prog)) }, (err) => { setError(err.message) setUploading(false) }, async () => { const url = await getDownloadURL(uploadTask.snapshot.ref) // save metadata to Firestore await addDoc(collection(db, 'photos'), { url, uploader: user ? user.email : null, uid: user ? user.uid : null, name: file.name, createdAt: serverTimestamp() }) setUploading(false) setProgress(0) }) } catch (err) { setError(err.message) setUploading(false) } }

return ( <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4"> <header className="w-full max-w-md"> <div className="bg-white shadow-md rounded-2xl p-4 flex items-center justify-between"> <div> <h1 className="text-xl font-bold">Hilmi Yumni</h1> <p className="text-sm text-gray-500">Web mobile — tambahkan foto & login dengan email</p> </div> <div> {loadingUser ? ( <div className="text-sm text-gray-400">Memuat...</div> ) : user ? ( <div className="text-right"> <div className="text-sm">{user.email}</div> <button onClick={handleLogout} className="mt-1 px-3 py-1 rounded-lg border text-sm">Logout</button> </div> ) : ( <div className="text-sm text-gray-500">Tidak login</div> )} </div> </div> </header>

<main className="w-full max-w-md mt-4">
    {/* Auth box */}
    {!user && (
      <section className="bg-white p-4 rounded-2xl shadow mb-4">
        <form className="space-y-2">
          <input className="w-full p-2 rounded border" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full p-2 rounded border" placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={handleLogin} className="flex-1 p-2 rounded-lg border">Login</button>
            <button onClick={handleSignup} className="flex-1 p-2 rounded-lg bg-blue-600 text-white">Daftar</button>
          </div>
          {error && <div className="text-sm text-red-500">{error}</div>}
          <div className="text-xs text-gray-400">Catatan: Gunakan email dan password untuk membuat akun.</div>
        </form>
      </section>
    )}

    {/* Upload box */}
    <section className="bg-white p-4 rounded-2xl shadow mb-4">
      <div className="flex items-center justify-between mb-2">
        <strong>Tambahkan Foto</strong>
        <span className="text-xs text-gray-400">Maks 10MB</span>
      </div>
      <label className="block">
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="w-full" />
      </label>
      {uploading && (
        <div className="mt-2 text-sm">Mengunggah... {progress}%</div>
      )}
    </section>

    {/* Gallery */}
    <section className="bg-white p-3 rounded-2xl shadow">
      <div className="flex items-center justify-between mb-3">
        <strong>Galeri Publik</strong>
        <span className="text-xs text-gray-400">{photos.length} foto</span>
      </div>
      {photos.length === 0 ? (
        <div className="text-sm text-gray-500">Belum ada foto. Jadilah yang pertama mengunggah!</div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map(p => (
            <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
              <img src={p.url} alt={p.name} className="w-full h-24 object-cover rounded" />
            </a>
          ))}
        </div>
      )}
    </section>

    <footer className="mt-4 text-center text-xs text-gray-400">
      Dibuat untuk Hilmi Yumni — mobile-friendly.
    </footer>
  </main>
</div>

) }

