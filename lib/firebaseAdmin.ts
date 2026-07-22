import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Server-only: must never be imported from a "use client" component or any
// module a client component also imports, or its secrets risk being pulled
// into the client bundle.
function getAdminApp() {
  return getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
            /\\n/g,
            "\n",
          ),
        }),
      });
}

// Exposed as getters (not top-level consts) so initialization only happens
// when a route handler actually runs, not when Next.js statically imports
// the route module during `next build`'s page-data collection — which would
// otherwise fail whenever admin credentials aren't present in the build
// environment.
export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}
