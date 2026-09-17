import { createHmac } from "crypto";

const JWT_SECRET =
  process.env.JWT_SECRET || "halluciguard-secure-jwt-key-2026-production-supervisor";

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
  iat?: number;
  exp?: number;
  [key: string]: any;
}

export function signJwt(payload: JwtPayload, expiresInHours = 24 * 7): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInHours * 3600,
  };
  const header = { alg: "HS256", typ: "JWT" };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const head = encode(header);
  const body = encode(fullPayload);
  const signature = createHmac("sha256", JWT_SECRET)
    .update(`${head}.${body}`)
    .digest("base64url");
  return `${head}.${body}.${signature}`;
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    if (!token || typeof token !== "string") return null;
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return null;
    const [head, body, signature] = parts;
    const expected = createHmac("sha256", JWT_SECRET)
      .update(`${head}.${body}`)
      .digest("base64url");
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}
