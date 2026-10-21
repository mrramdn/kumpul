type Level = "info" | "warn" | "error";

// Satu baris JSON per kejadian. Docker menyimpan output container, jadi log bisa dibaca dengan
// `docker compose logs web` dan disaring, misalnya `docker compose logs web | grep '"status":5'`.
export function log(level: Level, message: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, message, ...fields });
  if (level === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}
