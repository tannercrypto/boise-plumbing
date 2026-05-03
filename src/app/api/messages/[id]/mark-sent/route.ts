// src/app/api/messages/[id]/mark-sent/route.ts
// POST /api/messages/:id/mark-sent
// Bridge calls this after successfully sending a message via macOS Messages.

import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeRequest } from "@/lib/messaging/bridgeAuth";
import { markMessageSent } from "@/lib/messaging/messageQueue";
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
  const ok = await markMessageSent(id);

  if (!ok) {
    return NextResponse.json({ error: "Message not found or already updated" }, { status: 404 });
  }

  return NextResponse.json({ success: true, id });
}
