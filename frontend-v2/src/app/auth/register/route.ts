import { NextRequest, NextResponse } from "next/server";
import { signJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body?.email || "").toLowerCase().trim();
    const password = (body?.password || "").trim();
    const displayName = (body?.name || "").trim() || email.split("@")[0];

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Valid email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { detail: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    const sub = `usr_${Buffer.from(email).toString("hex").slice(0, 16)}`;
    const now = new Date().toISOString();

    const token = signJwt({ sub, email, name: displayName, picture: null });

    return NextResponse.json({
      status: "success",
      access_token: token,
      token_type: "bearer",
      user: {
        id: sub,
        sub,
        email,
        name: displayName,
        picture: null,
        created_at: now,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Registration failed" }, { status: 500 });
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
