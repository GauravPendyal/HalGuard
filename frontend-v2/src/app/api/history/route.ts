import { NextRequest, NextResponse } from "next/server";
import { verifyJwt } from "@/lib/server/jwt";

export const dynamic = "force-dynamic";

// In-memory store for session persistence
const historyStore = new Map<string, any[]>();

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json(
        { detail: "Authentication required." },
        { status: 401 }
      );
    }

    const userId = payload.sub;
    const items = historyStore.get(userId) || [];
    return NextResponse.json({ status: "success", history: items });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to load history" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json(
        { detail: "Authentication required." },
        { status: 401 }
      );
    }

    const userId = payload.sub;
    const body = await req.json();
    const query = body?.query || "";
    const result = body?.result || {};
    const id = result?.execution_id || `hist_${Date.now()}`;
    const verdict = result?.verification_status || "unverified";
    const confidence = result?.verifier?.overall_evidence_confidence || 0.85;
    const createdAt = new Date().toISOString();

    const record = {
      id,
      user_id: userId,
      query,
      verdict,
      confidence,
      result,
      created_at: createdAt,
    };

    const current = historyStore.get(userId) || [];
    historyStore.set(userId, [record, ...current.filter((r) => r.id !== id)].slice(0, 50));

    return NextResponse.json({ status: "success", record });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to save history" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const payload = verifyJwt(authHeader);
    if (!payload) {
      return NextResponse.json(
        { detail: "Authentication required." },
        { status: 401 }
      );
    }

    const userId = payload.sub;
    historyStore.delete(userId);
    return NextResponse.json({ status: "success", message: "History cleared" });
  } catch (err: any) {
    return NextResponse.json({ detail: err?.message || "Failed to clear history" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
