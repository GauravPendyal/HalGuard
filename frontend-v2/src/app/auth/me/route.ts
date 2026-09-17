import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { detail: "Authentication required. Please provide a valid Bearer token." },
        { status: 401 }
      );
    }

    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json(
        { detail: "Session expired or invalid token." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      status: "success",
      user: {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture || null,
        created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Session verification failed" }, { status: 401 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
