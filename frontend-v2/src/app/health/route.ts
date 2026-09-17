import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    backend_status: "healthy",
    environment: "production",
    engine: "langgraph_production_supervisor",
    active_agents: ["base_llm", "detector", "verifier", "memory"],
    disabled_agents: {
      judge: { enabled: false, status: "not_executed" },
      corrector: { enabled: false, status: "not_executed" },
    },
    timestamp: new Date().toISOString(),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
