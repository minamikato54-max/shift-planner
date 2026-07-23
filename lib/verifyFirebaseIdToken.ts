import "server-only";
import jwt from "jsonwebtoken";

// Verifies a Firebase Authentication ID token WITHOUT using
// firebase-admin/auth's verifyIdToken(). That module pulls in jwks-rsa ->
// jose, and the currently-published versions of those packages have a real
// upstream ESM/CJS incompatibility (jose 6.x ships "type": "module" with no
// CJS build, but jwks-rsa require()s it) that makes any Next.js Route
// Handler importing firebase-admin/auth fail at runtime in Vercel's
// serverless/Turbopack build with `ERR_REQUIRE_ESM`, even though the exact
// same code works fine in local `next dev`. Verifying the token by hand
// against Google's public certs, using the plain-CJS `jsonwebtoken` package,
// sidesteps that broken dependency chain entirely.
//
// This checks exactly what firebase-admin's verifyIdToken checks: RS256
// signature against Google's current public certs, `aud` == project id,
// `iss` == "https://securetoken.google.com/{projectId}", and expiry (via
// jsonwebtoken's own exp/nbf handling).

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certsCache: { certs: Record<string, string>; fetchedAt: number } | null =
  null;
const CERTS_TTL_MS = 60 * 60 * 1000; // 1 hour, well under Google's own cache-control

async function getGoogleCerts(): Promise<Record<string, string>> {
  if (certsCache && Date.now() - certsCache.fetchedAt < CERTS_TTL_MS) {
    return certsCache.certs;
  }

  const res = await fetch(CERTS_URL);
  if (!res.ok) {
    throw new Error(`Googleの公開鍵取得に失敗しました（${res.status}）`);
  }
  const certs = (await res.json()) as Record<string, string>;
  certsCache = { certs, fetchedAt: Date.now() };
  return certs;
}

export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<{ uid: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set");

  const decodedHeader = jwt.decode(idToken, { complete: true });
  const kid = decodedHeader?.header.kid;
  if (!kid) throw new Error("invalid token: missing kid");

  const certs = await getGoogleCerts();
  const cert = certs[kid];
  if (!cert) throw new Error("invalid token: unknown kid");

  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("invalid token: missing sub");
  }

  return { uid: payload.sub };
}
