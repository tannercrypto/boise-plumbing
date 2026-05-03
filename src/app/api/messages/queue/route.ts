// src/app/api/messages/queue/route.ts
// GET /api/messages/queue
// Returns QUEUED messages for the mac-message-bridge to process.
// Authentication: LOCAL_BRIDGE_API_KEY header (x-bridge-api-key).
// This endpoint is NOT accessible via admin session — bridge-only.
//
// IMPORTANT: Never expose LOCAL_BRIDGE_API_KEY to any frontend.
// This endpoint returns phone numbers and message bodies — sensitive data.

import { NextRequest, NextResponse } from "next/server";
import { verifyBridgeRequest } from "@/lib/messaging/bridgeAuth";
import { getQueuedMessages } from "@/lib/messaging/messageQueue";
import { limitMessageQueue } from "@/lib/security/rateLimit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "bridge";
  const rl = limitMessageQueue(ip);
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const auth = verifyBridgeRequest(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? "Unauthorized" },
      { status: 401 }
    );
  }

  const url   = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);

  const messages = await getQueuedMessages(limit);

  return NextResponse.json({
    success: true,
    count:   messages.length,
    messages,
  });
}
