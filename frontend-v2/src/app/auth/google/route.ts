import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  "88154202029-lrr58hkhqmu7td24ln93i6t21jp8hki2.apps.googleusercontent.com";

const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID || "amdslingshot-494005";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const credential = (body?.credential || body?.token || "").trim();

    if (!credential) {
      return NextResponse.json(
        { detail: "Google credential ID token is required." },
        { status: 400 }
      );
    }

    // Validate ID token against Google's official tokeninfo service
    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { method: "GET", cache: "no-store" }
    );

    if (!googleRes.ok) {
      const errText = await googleRes.text();
      return NextResponse.json(
        { detail: `Google authentication failed: ${errText || "Invalid token"}` },
        { status: 401 }
      );
    }

    const payload = await googleRes.json();

    // Verify Audience
    const aud = payload.aud;
    const azp = payload.azp;
    const isAudValid =
      aud === GOOGLE_CLIENT_ID ||
      azp === GOOGLE_CLIENT_ID ||
      aud === GOOGLE_PROJECT_ID ||
      (typeof aud === "string" && aud.includes("88154202029"));

    if (!isAudValid) {
      return NextResponse.json(
        { detail: "Google token audience mismatch." },
        { status: 401 }
      );
    }

    // Verify Issuer
    const iss = payload.iss;
    if (iss !== "accounts.google.com" && iss !== "https://accounts.google.com") {
      return NextResponse.json(
        { detail: "Google token issuer invalid." },
        { status: 401 }
      );
    }

    const email = (payload.email || "").toLowerCase().trim();
    if (!email) {
      return NextResponse.json(
        { detail: "Google token missing email address." },
        { status: 400 }
      );
    }

    const name = (payload.name || payload.given_name || email.split("@")[0]).trim();
    const picture = payload.picture || null;
    const sub = payload.sub || email;
    const now = new Date().toISOString();

    // Issue HalluciGuard session JWT
    const token = signJwt({
      sub,
      email,
      name,
      picture,
    });

    return NextResponse.json({
      status: "success",
      access_token: token,
      token_type: "bearer",
      user: {
        id: sub,
        sub,
        email,
        name,
        picture,
        created_at: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: `Authentication error: ${err?.message || "Internal error"}` },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
