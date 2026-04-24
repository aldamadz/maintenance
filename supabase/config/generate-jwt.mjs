import crypto from "node:crypto";

function base64Url(input) {
  const source =
    typeof input === "string" ? Buffer.from(input, "utf8") : Buffer.from(input);
  return source
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signJwt(payload, secret) {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsignedToken)
    .digest();

  return `${unsignedToken}.${base64Url(signature)}`;
}

const secret = process.argv[2];

if (!secret) {
  console.error("Usage: node supabase/config/generate-jwt.mjs <JWT_SECRET>");
  process.exit(1);
}

const basePayload = {
  aud: "authenticated",
  iss: "maintenance-self-hosted",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
};

const anonKey = signJwt(
  {
    ...basePayload,
    role: "anon",
  },
  secret,
);

const serviceRoleKey = signJwt(
  {
    ...basePayload,
    role: "service_role",
  },
  secret,
);

console.log(`SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`);

