// Uji REST API Kumpul dari luar, seperti klien sungguhan.
// Jalankan saat stack hidup: docker compose --profile test run --rm uji
// Atau dari laptop (Node 22+): BASE_URL=http://localhost:3000 node --test tests/
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Satu klien = satu browser: menyimpan cookie sesi dari respons dan mengirimnya lagi. */
function client() {
  let cookie = "";
  return async function call(method, path, { body, lang = "id" } = {}) {
    const headers = { "Accept-Language": lang };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    for (const line of response.headers.getSetCookie()) {
      const [name, value] = line.split(";")[0].split("=");
      if (name === "kumpul_session") cookie = value ? `${name}=${value}` : "";
    }
    const text = await response.text();
    const json = response.headers.get("content-type")?.includes("application/json") && text ? JSON.parse(text) : text;
    return { status: response.status, headers: response.headers, body: json };
  };
}

/** Tanggal dan jam WIB dalam format input form, misalnya wib(3, 13) = tiga hari lagi jam 13.00. */
function wib(daysFromNow, hour) {
  const date = new Date(Date.now() + daysFromNow * 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

const guest = client();
const owner = client();
const attendee = client();
const other = client();
const accounts = [
  [owner, "Penyelenggara Uji"],
  [attendee, "Peserta Uji"],
  [other, "Akun Lain Uji"],
];
const emailOf = (index) => `uji-${RUN}-${index}@example.test`;

function eventBody(overrides = {}) {
  return {
    title: "Acara uji otomatis",
    host: "Tim penguji",
    location: "Lab Komputer 3",
    startsAt: wib(10, 13),
    endsAt: wib(10, 15),
    capacity: 2,
    ...overrides,
  };
}

async function createEvent(overrides = {}) {
  const response = await owner("POST", "/api/events", { body: eventBody(overrides) });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body.data;
}

before(async () => {
  for (const [index, [call, name]] of accounts.entries()) {
    const response = await call("POST", "/api/users", {
      body: { name, email: emailOf(index), password: "rahasia-uji-123" },
    });
    assert.equal(response.status, 201, JSON.stringify(response.body));
  }
});

// Akun uji dihapus lagi; acara dan pendaftarannya ikut terhapus (ON DELETE CASCADE).
after(async () => {
  for (const [call] of accounts) await call("DELETE", "/api/users/me");
});

describe("layanan", () => {
  test("health: web dan database sehat", async () => {
    const response = await guest("GET", "/api/health");
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
    assert.equal(response.body.database, "up");
  });

  test("dokumentasi API tersedia dalam dua bahasa", async () => {
    const english = await guest("GET", "/api/openapi.json?lang=en");
    assert.equal(english.status, 200);
    assert.equal(english.body.openapi, "3.1.0");
    assert.equal(english.body.paths["/api/events"].get.summary, "List events");
    const indonesian = await guest("GET", "/api/openapi.json?lang=id");
    assert.equal(indonesian.body.paths["/api/events"].get.summary, "Daftar acara");
    const page = await guest("GET", "/api/docs");
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /text\/html/);
  });
});

describe("akun", () => {
  test("email disimpan huruf kecil dan tidak bisa dipakai dua kali", async () => {
    const response = await guest("POST", "/api/users", {
      body: { name: "Ganda", email: emailOf(0).toUpperCase(), password: "rahasia-uji-123" },
    });
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "EMAIL_TAKEN");
  });

  test("isian akun divalidasi, pesannya ikut bahasa", async () => {
    const response = await guest("POST", "/api/users", {
      lang: "en",
      body: { name: "A", email: "x", password: "123" },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.message, "Some fields are invalid.");
    assert.equal(response.body.error.fields.password, "Password must be at least 8 characters.");
  });

  test("masuk, cek sesi, lalu keluar", async () => {
    const login = client();
    const wrong = await login("POST", "/api/session", { body: { email: emailOf(1), password: "password-salah" } });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.body.error.code, "INVALID_CREDENTIALS");

    const ok = await login("POST", "/api/session", { body: { email: emailOf(1), password: "rahasia-uji-123" } });
    assert.equal(ok.status, 200);
    assert.equal((await login("GET", "/api/session")).body.data.user.email, emailOf(1));

    assert.equal((await login("DELETE", "/api/session")).status, 204);
    assert.equal((await login("GET", "/api/session")).body.data.user, null);
  });
});

describe("acara", () => {
  test("daftar acara bisa dibaca tanpa login; filter yang tidak dikenal ditolak", async () => {
    const list = await guest("GET", "/api/events?when=upcoming");
    assert.equal(list.status, 200);
    assert.ok(Array.isArray(list.body.data));
    const invalid = await guest("GET", "/api/events?when=besok");
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "INVALID_FILTER");
  });

  test("membuat acara butuh login", async () => {
    const response = await guest("POST", "/api/events", { body: eventBody() });
    assert.equal(response.status, 401);
    assert.equal(response.body.error.code, "UNAUTHORIZED");
  });

  test("input tidak valid ditolak dengan pesan per isian", async () => {
    const response = await owner("POST", "/api/events", { body: eventBody({ title: "ab", host: "", capacity: 0 }) });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(response.body.error.fields.title, "Judul minimal 3 karakter.");
    assert.equal(response.body.error.fields.host, "Penyelenggara wajib diisi.");
    assert.ok(response.body.error.fields.capacity);
  });

  test("waktu selesai harus setelah waktu mulai", async () => {
    const response = await owner("POST", "/api/events", {
      body: eventBody({ startsAt: wib(5, 12), endsAt: wib(5, 10) }),
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.fields.endsAt, "Waktu selesai harus setelah waktu mulai.");
  });

  test("body yang bukan JSON ditolak", async () => {
    const response = await owner("POST", "/api/events", { body: "{bukan json" });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_JSON");
  });

  test("ID yang bukan UUID ditolak, ID yang tidak ada 404", async () => {
    const invalid = await guest("GET", "/api/events/123");
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "INVALID_ID");
    const missing = await guest("GET", `/api/events/${UNKNOWN_ID}`);
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, "EVENT_NOT_FOUND");
  });

  test("CRUD oleh pemilik: buat, baca, ubah, hapus", async () => {
    const event = await createEvent({ title: "Acara CRUD", startsAt: wib(7, 9), endsAt: wib(7, 11) });
    assert.match(event.id, /^[0-9a-f-]{36}$/);
    // 09.00 WIB = 02.00 UTC
    assert.equal(event.startsAt.slice(11, 16), "02:00");

    const read = await guest("GET", `/api/events/${event.id}`);
    assert.equal(read.status, 200);
    assert.equal(read.body.data.title, "Acara CRUD");

    const updated = await owner("PUT", `/api/events/${event.id}`, {
      body: eventBody({ title: "Acara CRUD (diubah)", startsAt: wib(7, 9), endsAt: wib(7, 12), capacity: null }),
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.title, "Acara CRUD (diubah)");
    assert.equal(updated.body.data.capacity, null);

    assert.equal((await owner("DELETE", `/api/events/${event.id}`)).status, 204);
    assert.equal((await guest("GET", `/api/events/${event.id}`)).status, 404);
  });

  test("akun lain tidak bisa mengubah atau menghapus acara", async () => {
    const event = await createEvent({ title: "Acara milik orang lain" });
    const edit = await other("PUT", `/api/events/${event.id}`, { body: eventBody({ title: "Diambil alih" }) });
    assert.equal(edit.status, 403);
    assert.equal(edit.body.error.code, "NOT_EVENT_OWNER");
    assert.equal((await other("DELETE", `/api/events/${event.id}`)).status, 403);
    assert.equal((await guest("GET", `/api/events/${event.id}`)).body.data.title, "Acara milik orang lain");
  });
});

describe("pendaftaran", () => {
  test("mendaftar butuh login, dan hanya sekali per akun", async () => {
    const event = await createEvent({ title: "Acara daftar sekali" });
    assert.equal((await guest("POST", `/api/events/${event.id}/registrations`)).status, 401);

    const first = await attendee("POST", `/api/events/${event.id}/registrations`);
    assert.equal(first.status, 201);
    assert.equal(first.body.data.email, emailOf(1));

    const again = await attendee("POST", `/api/events/${event.id}/registrations`);
    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, "ALREADY_REGISTERED");

    const mine = await attendee("GET", "/api/me/events");
    assert.ok(mine.body.data.attending.some((item) => item.id === event.id));
  });

  test("kuota, email peserta, dan kapasitas", async () => {
    const event = await createEvent({ title: "Acara kuota satu", capacity: 1 });
    const registered = await attendee("POST", `/api/events/${event.id}/registrations`);
    assert.equal(registered.status, 201);

    const full = await other("POST", `/api/events/${event.id}/registrations`);
    assert.equal(full.status, 409);
    assert.equal(full.body.error.code, "EVENT_FULL");

    // Pemilik melihat email lengkap; akun lain melihat versi disamarkan.
    const forOwner = await owner("GET", `/api/events/${event.id}/registrations`);
    assert.equal(forOwner.body.data[0].email, emailOf(1));
    const forOther = await other("GET", `/api/events/${event.id}/registrations`);
    assert.match(forOther.body.data[0].email, /^uj\*\*\*@example\.test$/);

    const shrink = await owner("PUT", `/api/events/${event.id}`, {
      body: eventBody({ title: "Acara kuota satu", capacity: 0 }),
    });
    assert.equal(shrink.status, 400);
  });

  test("peserta membatalkan sendiri; akun lain tidak bisa; pemilik bisa menghapus peserta", async () => {
    const event = await createEvent({ title: "Acara pembatalan", capacity: 5 });
    const a = await attendee("POST", `/api/events/${event.id}/registrations`);
    const b = await other("POST", `/api/events/${event.id}/registrations`);

    const shrink = await owner("PUT", `/api/events/${event.id}`, {
      body: eventBody({ title: "Acara pembatalan", capacity: 1 }),
    });
    assert.equal(shrink.status, 409);
    assert.equal(shrink.body.error.code, "CAPACITY_BELOW_REGISTERED");

    const notMine = await other("DELETE", `/api/events/${event.id}/registrations/${a.body.data.id}`);
    assert.equal(notMine.status, 403);
    assert.equal((await attendee("DELETE", `/api/events/${event.id}/registrations/${a.body.data.id}`)).status, 204);
    assert.equal((await owner("DELETE", `/api/events/${event.id}/registrations/${b.body.data.id}`)).status, 204);
    assert.equal((await owner("GET", `/api/events/${event.id}/registrations`)).body.data.length, 0);
  });

  test("pendaftaran ditutup untuk acara yang sudah selesai", async () => {
    const event = await createEvent({ title: "Acara kemarin", startsAt: wib(-2, 8), endsAt: wib(-2, 10) });
    const response = await attendee("POST", `/api/events/${event.id}/registrations`);
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "EVENT_ENDED");
  });
});
