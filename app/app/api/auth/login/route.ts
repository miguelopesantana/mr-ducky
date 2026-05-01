import { NextRequest, NextResponse } from "next/server";
import { apiClient } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const result = await apiClient<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const { access_token } = result.data;

  const res = NextResponse.json({ ok: true });
  res.cookies.set("auth_token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
