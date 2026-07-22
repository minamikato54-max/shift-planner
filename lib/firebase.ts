import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, GoogleAuthProvider, getAuth } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase Auth relies on browser-only APIs, and Next.js prerenders "use client"
// pages on the server at build time too — only initialize once running in the browser.
function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export const auth = (
  typeof window !== "undefined" ? getAuth(getFirebaseApp()) : undefined
) as Auth;
export const db = (
  typeof window !== "undefined" ? getFirestore(getFirebaseApp()) : undefined
) as Firestore;
export const googleProvider = new GoogleAuthProvider();
