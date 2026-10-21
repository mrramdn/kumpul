// Fungsi kecil untuk tampilan. Tidak menyentuh database, jadi aman dipakai di server maupun browser.

/** "budi.santoso@example.com" -> "bu***@example.com". Belum ada login, jadi email peserta tidak ditampilkan utuh. */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}***@${domain}`;
}

/** "Budi Santoso" -> "BS" */
export function initials(name: string) {
  const words = name.trim().split(/\s+/);
  return (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : "")).toUpperCase();
}
