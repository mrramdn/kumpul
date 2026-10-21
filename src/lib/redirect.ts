/**
 * Alamat tujuan setelah masuk, dari ?lanjut=. Hanya alamat di situs ini sendiri ("/acara/..."),
 * bukan "//situs-lain.com", supaya tidak bisa dipakai untuk mengalihkan pengguna ke situs lain.
 */
export function safeNext(value: string | string[] | undefined) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}
