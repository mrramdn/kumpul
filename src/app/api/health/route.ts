import { connection } from "next/server";
import { query } from "@/lib/db";
import { handle } from "@/lib/http";
import { log } from "@/lib/log";

// Dipakai healthcheck Docker (setiap 10 detik) dan indikator status di footer.
// 200 kalau web dan database sehat, 503 kalau database tidak bisa dihubungi.
export const GET = handle(
  async () => {
    await connection();
    const startedAt = performance.now();
    const base = {
      environment: process.env.APP_ENV ?? "local",
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date().toISOString(),
    };
    try {
      await query("SELECT 1");
    } catch (error) {
      log("warn", "health check: database tidak bisa dihubungi", {
        error: error instanceof Error ? error.message : String(error),
      });
      return Response.json(
        { status: "error", web: "up", database: "down", ...base },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      {
        status: "ok",
        web: "up",
        database: "up",
        databaseLatencyMs: Math.round((performance.now() - startedAt) * 10) / 10,
        ...base,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
  { quiet: true },
);
