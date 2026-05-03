// src/app/api/admin/clients/[id]/settings/route.ts
// GET  /api/admin/clients/:id/settings — return current settings
// PATCH /api/admin/clients/:id/settings — update settings

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdminApiRequest } from "@/lib/auth/adminAuth";
import { prisma } from "@/lib/db/client";
import type { ApiResponse } from "@/types";

const settingsSchema = z.object({
  defaultRoute:             z.enum(["jobber_only", "dashboard_only", "sms_only", "jobber_and_sms"]).optional(),
  messagingEnabled:         z.boolean().optional(),
  messageRecipientPhones:   z.array(z.string().max(20)).max(10).optional(),
  defaultMessageTemplateId: z.string().cuid().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const settings = await prisma.clientSettings.findUnique({
    where:   { clientId: id },
    include: { defaultMessageTemplate: { select: { id: true, name: true } } },
  });

  return NextResponse.json<ApiResponse>({
    success: true,
    data: settings ?? {
      defaultRoute:             "jobber_only",
      messagingEnabled:         false,
      messageRecipientPhones:   [],
      defaultMessageTemplateId: null,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = verifyAdminApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiResponse>({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { success: false, error: "Validation failed", data: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  // Verify client exists
  const client = await prisma.client.findUnique({ where: { id }, select: { id: true } });
  if (!client) {
    return NextResponse.json<ApiResponse>({ success: false, error: "Client not found" }, { status: 404 });
  }

  const data = parsed.data;

  const settings = await prisma.clientSettings.upsert({
    where:  { clientId: id },
    create: {
      clientId:                 id,
      defaultRoute:             data.defaultRoute              ?? "jobber_only",
      messagingEnabled:         data.messagingEnabled          ?? false,
      messageRecipientPhones:   data.messageRecipientPhones    ?? [],
      defaultMessageTemplateId: data.defaultMessageTemplateId  ?? null,
    },
    update: {
      ...(data.defaultRoute              !== undefined ? { defaultRoute:             data.defaultRoute }              : {}),
      ...(data.messagingEnabled          !== undefined ? { messagingEnabled:         data.messagingEnabled }          : {}),
      ...(data.messageRecipientPhones    !== undefined ? { messageRecipientPhones:   data.messageRecipientPhones }    : {}),
      ...(data.defaultMessageTemplateId  !== undefined ? { defaultMessageTemplateId: data.defaultMessageTemplateId }  : {}),
    },
  });

  return NextResponse.json<ApiResponse>({ success: true, data: settings });
}
