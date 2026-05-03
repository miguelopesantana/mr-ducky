import { NextRequest, NextResponse } from "next/server";
import { authedClient } from "@/lib/api-client";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = req.cookies.get("auth_token")?.value;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await authedClient(token)<unknown>(`/actions/calls/${id}`, {
    method: "DELETE",
  });

  if (!result.ok && result.status !== 204) {
    return NextResponse.json({ error: result.error }, { status: result.status || 500 });
  }
  return new NextResponse(null, { status: 204 });
}
