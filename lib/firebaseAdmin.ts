import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// NOTE: deliberately does NOT export a getAdminAuth()/firebase-admin/auth
// helper. That module's verifyIdToken() drags in jwks-rsa -> jose, and the
// currently-published versions of those packages are ESM/CJS-incompatible
// in a way that throws ERR_REQUIRE_ESM in Vercel's production build (works
// fine in `next dev`, fails in the deployed serverless function). ID tokens
// are verified instead via lib/verifyFirebaseIdToken.ts, which only needs
// the plain-CJS `jsonwebtoken` package. Do not reintroduce
// `import { getAuth } from "firebase-admin/auth"` here without re-testing a
// real Vercel deploy first.

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

// Exposed as a getter (not a top-level const) so initialization only happens
// when a route handler actually runs, not when Next.js statically imports
// the route module during `next build`'s page-data collection — which would
// otherwise fail whenever admin credentials aren't present in the build
// environment.
export function getAdminDb() {
  return getFirestore(getAdminApp());
}
