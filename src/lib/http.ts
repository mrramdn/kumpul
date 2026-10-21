import { ZodError } from "zod";
import { getDictionary, type Dictionary, type ErrorCode } from "@/i18n";
import { format } from "@/i18n/format";
import { log } from "./log";

/**
 * Error yang sengaja dikirim ke klien, dengan status HTTP dan kode yang bisa dibaca program.
 * Pesannya diambil dari kamus bahasa (src/i18n) saat respons dibuat, jadi ikut bahasa pengguna.
 * field: nama isian form yang ikut ditandai merah.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly detail: { values?: Record<string, string | number>; field?: string } = {},
  ) {
    super(code);
  }
}

export function json(data: unknown, init?: ResponseInit) {
  return Response.json({ data }, init);
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON");
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID.test(value);
}

export function parseId(value: string, label: string) {
  if (!isUuid(value)) throw new ApiError(400, "INVALID_ID", { values: { label } });
  return value.toLowerCase();
}

// Kode error dari driver pg atau dari Node saat database tidak bisa dihubungi.
// 08xxx = connection exception, 57P01 = server dimatikan, 57P03 = server belum siap menerima koneksi.
const DATABASE_DOWN_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "ECONNRESET",
  "57P01",
  "57P03",
]);

export function isDatabaseDown(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  if (typeof code === "string" && (DATABASE_DOWN_CODES.has(code) || code.startsWith("08"))) return true;
  if (error instanceof AggregateError) return error.errors.some(isDatabaseDown);
  return /timeout exceeded when trying to connect|Connection terminated/i.test(error.message);
}

function errorBody(error: unknown, t: Dictionary) {
  if (error instanceof ZodError) {
    // Pesan validasi sudah dalam bahasa pengguna (dibuat di validation.ts). Ambil satu pesan per isian.
    const fields: Record<string, string> = {};
    for (const issue of error.issues) {
      fields[issue.path.join(".") || "body"] ??= issue.message;
    }
    return { status: 400, code: "VALIDATION_ERROR" as const, message: t.errors.VALIDATION_ERROR, fields };
  }
  const apiError =
    error instanceof ApiError
      ? error
      : isDatabaseDown(error)
        ? new ApiError(503, "DATABASE_UNAVAILABLE")
        : new ApiError(500, "INTERNAL_ERROR");
  const message = format(t.errors[apiError.code], apiError.detail.values);
  const field = apiError.detail.field;
  return { status: apiError.status, code: apiError.code, message, fields: field ? { [field]: message } : undefined };
}

type Handler<Context> = (request: Request, context: Context, t: Dictionary) => Promise<Response>;

/**
 * Membungkus setiap route API: mengubah error menjadi respons JSON yang konsisten
 * ({ error: { code, message, fields } }) dan menulis satu baris log per request.
 * quiet: request yang berhasil tidak dicatat (dipakai /api/health, yang dicek setiap 10 detik).
 */
export function handle<Context>(handler: Handler<Context>, options: { quiet?: boolean } = {}) {
  return async (request: Request, context: Context) => {
    const startedAt = performance.now();
    const path = new URL(request.url).pathname;
    const t = await getDictionary();
    let response: Response;
    let errorCode: string | undefined;
    try {
      response = await handler(request, context, t);
    } catch (error) {
      const body = errorBody(error, t);
      errorCode = body.code;
      if (body.status >= 500) {
        log("error", "request gagal", {
          method: request.method,
          path,
          code: body.code,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      response = Response.json(
        { error: { code: body.code, message: body.message, fields: body.fields } },
        { status: body.status },
      );
    }
    const status = response.status;
    if (!options.quiet || status >= 400) {
      log(status >= 500 ? "error" : status >= 400 ? "warn" : "info", "request", {
        method: request.method,
        path,
        status,
        durationMs: Math.round((performance.now() - startedAt) * 10) / 10,
        ...(errorCode ? { code: errorCode } : {}),
      });
    }
    return response;
  };
}
