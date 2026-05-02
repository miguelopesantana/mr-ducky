import { NextRequest, NextResponse } from "next/server";
import { authedClient } from "@/lib/api-client";

interface ChatTrace {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown> | null;
  error?: string | null;
  durationMs: number;
}

interface PendingAction {
  id: string;
  tool: string;
  summary: string;
  args: Record<string, unknown>;
  expiresAt: string;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  traces: ChatTrace[];
  pendingActions: PendingAction[];
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const result = await authedClient(token)<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error || "Chat request failed" },
      { status: result.status || 500 },
    );
  }
  return NextResponse.json(result.data);
}
