// Dipakai komponen di browser untuk memanggil REST API sendiri (/api/...).

export type ApiResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string; fields: Record<string, string> };

export async function sendJson<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body: unknown,
  networkMessage: string,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) return { ok: true, data: undefined as T };
    const payload = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: payload?.data as T };
    return {
      ok: false,
      status: response.status,
      message: payload?.error?.message ?? networkMessage,
      fields: payload?.error?.fields ?? {},
    };
  } catch {
    // fetch gagal total: server mati atau jaringan putus.
    return { ok: false, status: 0, message: networkMessage, fields: {} };
  }
}
