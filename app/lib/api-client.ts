const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ApiResult<T> =
  | { ok: true; data: T; status: number }
  | { ok: false; error: string; status: number };

export async function apiClient<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResult<T>> {
  const url = `${BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      return { ok: false, error: res.statusText, status: res.status };
    }

    const data = (await res.json()) as T;
    return { ok: true, data, status: res.status };
  } catch (err) {
    return { ok: false, error: String(err), status: 0 };
  }
}

export function authedClient(token: string) {
  return <T>(path: string, init?: RequestInit) =>
    apiClient<T>(path, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, ...init?.headers },
    });
}
