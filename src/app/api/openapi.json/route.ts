import { getLang } from "@/i18n";
import { buildOpenApi } from "@/lib/openapi";

/** Spesifikasi OpenAPI dalam bahasa pengguna; ?lang=id atau ?lang=en untuk memilih langsung. */
export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("lang");
  const lang = requested === "id" || requested === "en" ? requested : await getLang();
  return Response.json(buildOpenApi(lang));
}
