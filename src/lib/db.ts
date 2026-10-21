import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { log } from "./log";

// count(*) bertipe BIGINT, yang dikirim Postgres sebagai teks. Jumlah pendaftar jauh di bawah 2^53,
// jadi aman diubah menjadi number biasa.
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

function createPool() {
  const pool = new Pool({
    // Di Docker Compose nilainya datang dari DB_*. Saat `pnpm dev`, cukup memakai POSTGRES_* di .env.
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? process.env.DB_PORT_LOCAL ?? 5432),
    database: process.env.DB_NAME ?? process.env.POSTGRES_DB ?? "kumpul",
    user: process.env.DB_USER ?? process.env.POSTGRES_USER ?? "kumpul",
    password: process.env.DB_PASSWORD ?? process.env.POSTGRES_PASSWORD,
    max: 10,
    // Kalau database mati, request langsung gagal dalam 3 detik, tidak menggantung.
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 5000,
    application_name: "kumpul-web",
  });
  // Koneksi idle yang putus (misalnya container db dihentikan) memicu event ini.
  // Tanpa listener, proses Node akan crash.
  pool.on("error", (error) => {
    log("warn", "koneksi database idle terputus", { error: error.message });
  });
  return pool;
}

// Saat `next dev`, modul dimuat ulang setiap file berubah. Pool disimpan di globalThis
// supaya tidak membuat pool baru (dan koneksi baru) setiap kali.
const globalForDb = globalThis as typeof globalThis & { kumpulPool?: Pool };
const pool = (globalForDb.kumpulPool ??= createPool());

export async function query<Row extends QueryResultRow>(text: string, values: unknown[] = []) {
  const result = await pool.query<Row>(text, values);
  return result.rows;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect();
  let broken = false;
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    // Kalau ROLLBACK juga gagal, koneksinya rusak: buang dari pool, jangan dipakai lagi.
    await client.query("ROLLBACK").catch(() => {
      broken = true;
    });
    throw error;
  } finally {
    client.release(broken);
  }
}
