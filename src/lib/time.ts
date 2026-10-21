// Semua jam di aplikasi ini memakai WIB (UTC+7, tanpa daylight saving).
// Database menyimpan TIMESTAMPTZ (titik waktu absolut); WIB hanya dipakai saat membaca input dan menampilkan.
export const TIME_ZONE = "Asia/Jakarta";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

const LOCAL_INPUT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Membaca "2026-10-24T13:00" (nilai input datetime-local, dianggap WIB)
 * atau ISO 8601 lengkap dengan zona waktu, misalnya "2026-10-24T06:00:00Z".
 */
export function parseDateTime(value: string): Date | null {
  if (LOCAL_INPUT.test(value)) {
    const date = new Date(`${value}:00+07:00`);
    // Tolak tanggal yang tidak ada, misalnya 31 Februari (JavaScript akan menggesernya ke Maret).
    if (Number.isNaN(date.getTime()) || toLocalInput(date) !== value) return null;
    return date;
  }
  if (ISO_WITH_ZONE.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/** Kebalikan dari parseDateTime: Date menjadi "2026-10-24T13:00" dalam WIB, untuk mengisi input form. */
export function toLocalInput(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 16);
}

/** "2026-10-24", hari dalam WIB. Dipakai untuk mengelompokkan acara per hari. */
export function dayKey(date: Date) {
  return toLocalInput(date).slice(0, 10);
}

function formatter(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE, ...options });
}

/** "24 Okt" */
export function formatDayMonth(date: Date, locale: string) {
  return formatter(locale, { day: "numeric", month: "short" }).format(date);
}

/** "Jumat" */
export function formatWeekday(date: Date, locale: string) {
  return formatter(locale, { weekday: "long" }).format(date);
}

/** "Jumat, 24 Oktober 2026" */
export function formatFullDate(date: Date, locale: string) {
  return formatter(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** "13.00" (id) atau "13:00" (en) */
export function formatClock(date: Date, locale: string) {
  return formatter(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
}

/** "13.00–16.00 WIB", atau dengan tanggal selesai kalau acaranya melewati tengah malam. */
export function formatTimeRange(start: Date, end: Date, locale: string) {
  if (dayKey(start) === dayKey(end)) {
    return `${formatClock(start, locale)}–${formatClock(end, locale)} WIB`;
  }
  return `${formatClock(start, locale)} WIB – ${formatDayMonth(end, locale)}, ${formatClock(end, locale)} WIB`;
}
