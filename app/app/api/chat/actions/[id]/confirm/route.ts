import { NextRequest, NextResponse } from "next/server";
import { authedClient } from "@/lib/api-client";

interface ActionConfirmation {
  id: string;
  status: string;
  result?: Record<string, unknown> | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await authedClient(token)<ActionConfirmation>(
    `/chat/actions/${id}/confirm`,
    { method: "POST" },
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status || 500 });
  }
  return NextResponse.json(result.data);
}
