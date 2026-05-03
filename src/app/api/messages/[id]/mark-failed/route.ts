// src/app/api/messages/[id]/mark-failed/route.ts
// POST /api/messages/:id/mark-failed
// Bridge calls this if sending fails (Messages.app error, timeout, etc.).
// Body: { "error": "reason string" }

import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeRequest } from "@/lib/messaging/bridgeAuth";
import { markMessageFailed } from "@/lib/messaging/messageQueue";
import { limitMessageUpdate } from "@/lib/security/rateLimit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "bridge";
  const rl = limitMessageUpdate(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = verifyBridgeRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason ?? "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let errorMessage = "Unknown error";
  try {
    const body = await request.json() as { error?: string };
    if (body.error) errorMessage = body.error;
  } catch {
    // body is optional — keep default error message
  }

  const ok = await markMessageFailed(id, errorMessage);

  if (!ok) {
    return NextResponse.json({ error: "Message not found or already updated" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
