import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (via jwks-rsa -> jose) fails to bundle under Turbopack's
  // server build: it tries to require() an ESM-only module and throws
  // ERR_REQUIRE_ESM at runtime. Marking it external skips bundling and lets
  // Node resolve it normally from node_modules at request time.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
