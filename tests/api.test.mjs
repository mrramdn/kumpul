// Uji REST API Kumpul dari luar, seperti klien sungguhan.
// Jalankan saat stack hidup: docker compose --profile test run --rm uji
// Atau dari laptop (Node 22+): BASE_URL=http://localhost:3000 ORGANIZER_PASSWORD=... node --test tests/
import assert from "node:assert/strict";
import { after, describe, test } from "node:test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const PASSWORD = process.env.ORGANIZER_PASSWORD ?? "";
const UNKNOWN_ID = "00000000-0000-4000-8000-000000000000";

async function api(method, path, { body, auth = false, lang = "id" } = {}) {
  const headers = { "Accept-Language": lang };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && PASSWORD) headers.Authorization = `Bearer ${PASSWORD}`;
  const response = await fetch(BASE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await response.text();
  const json = response.headers.get("content-type")?.includes("application/json") && text ? JSON.parse(text) : text;
  return { status: response.status, headers: response.headers, body: json };
}

/** Tanggal dan jam WIB dalam format input form, misalnya wib(3, 13) = tiga hari lagi jam 13.00. */
function wib(daysFromNow, hour) {
  const date = new Date(Date.now() + daysFromNow * 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10);
  return `${date}T${String(hour).padStart(2, "0")}:00`;
}

const createdIds = [];

async function createEvent(overrides = {}) {
  const response = await api("POST", "/api/events", {
    auth: true,
    body: {
      title: "Acara uji otomatis",
      host: "Tim penguji",
      location: "Lab Komputer 3",
      startsAt: wib(10, 13),
      endsAt: wib(10, 15),
      capacity: 2,
      ...overrides,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  createdIds.push(response.body.data.id);
  return response.body.data;
}

function register(eventId, name, email) {
  return api("POST", `/api/events/${eventId}/registrations`, { body: { name, email } });
}

// Data yang dibuat tes dihapus lagi, supaya database tetap bersih.
after(async () => {
  for (const id of createdIds) await api("DELETE", `/api/events/${id}`, { auth: true });
});

describe("layanan", () => {
  test("health: web dan database sehat", async () => {
    const response = await api("GET", "/api/health");
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "ok");
    assert.equal(response.body.database, "up");
  });

  test("dokumentasi API tersedia", async () => {
    const spec = await api("GET", "/api/openapi.json");
    assert.equal(spec.status, 200);
    assert.equal(spec.body.openapi, "3.1.0");
    assert.ok(spec.body.paths["/api/events"]);
    const docs = await api("GET", "/api/docs");
    assert.equal(docs.status, 200);
    assert.match(docs.headers.get("content-type"), /text\/html/);
  });
});

describe("acara", () => {
  test("daftar acara bisa dibaca tanpa login", async () => {
    const response = await api("GET", "/api/events?when=upcoming");
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body.data));
  });

  test("filter when yang tidak dikenal ditolak", async () => {
    const response = await api("GET", "/api/events?when=besok");
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_FILTER");
  });

  test(
    "membuat acara tanpa login ditolak",
    { skip: !PASSWORD && "mode terbuka (ORGANIZER_PASSWORD kosong)" },
    async () => {
      const response = await api("POST", "/api/events", { body: { title: "Tanpa login" } });
      assert.equal(response.status, 401);
      assert.equal(response.body.error.code, "UNAUTHORIZED");
    },
  );

  test("input tidak valid ditolak dengan pesan per isian", async () => {
    const response = await api("POST", "/api/events", {
      auth: true,
      body: { title: "ab", host: "", location: "Lab", startsAt: wib(5, 10), endsAt: wib(5, 12), capacity: 0 },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "VALIDATION_ERROR");
    assert.equal(response.body.error.fields.title, "Judul minimal 3 karakter.");
    assert.equal(response.body.error.fields.host, "Penyelenggara wajib diisi.");
    assert.ok(response.body.error.fields.capacity);
  });

  test("waktu selesai harus setelah waktu mulai", async () => {
    const response = await api("POST", "/api/events", {
      auth: true,
      body: { title: "Jam terbalik", host: "Tim penguji", location: "Lab", startsAt: wib(5, 12), endsAt: wib(5, 10) },
    });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.fields.endsAt, "Waktu selesai harus setelah waktu mulai.");
  });

  test("pesan error mengikuti bahasa (Accept-Language)", async () => {
    const response = await api("POST", "/api/events", { auth: true, lang: "en", body: { title: "ab" } });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.message, "Some fields are invalid.");
    assert.equal(response.body.error.fields.title, "Title must be at least 3 characters.");
  });

  test("body yang bukan JSON ditolak", async () => {
    const response = await api("POST", "/api/events", { auth: true, body: "{bukan json" });
    assert.equal(response.status, 400);
    assert.equal(response.body.error.code, "INVALID_JSON");
  });

  test("ID yang bukan UUID ditolak, ID yang tidak ada 404", async () => {
    const invalid = await api("GET", "/api/events/123");
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.error.code, "INVALID_ID");
    const missing = await api("GET", `/api/events/${UNKNOWN_ID}`);
    assert.equal(missing.status, 404);
    assert.equal(missing.body.error.code, "EVENT_NOT_FOUND");
  });

  test("CRUD: buat, baca, ubah, hapus", async () => {
    const event = await createEvent({ title: "Acara CRUD", startsAt: wib(7, 9), endsAt: wib(7, 11) });
    assert.match(event.id, /^[0-9a-f-]{36}$/);
    // 09.00 WIB = 02.00 UTC
    assert.equal(event.startsAt.slice(11, 16), "02:00");

    const read = await api("GET", `/api/events/${event.id}`);
    assert.equal(read.status, 200);
    assert.equal(read.body.data.title, "Acara CRUD");

    const updated = await api("PUT", `/api/events/${event.id}`, {
      auth: true,
      body: {
        title: "Acara CRUD (diubah)",
        host: "Tim penguji",
        location: "Aula",
        startsAt: wib(7, 9),
        endsAt: wib(7, 12),
        capacity: null,
      },
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.title, "Acara CRUD (diubah)");
    assert.equal(updated.body.data.capacity, null);

    const removed = await api("DELETE", `/api/events/${event.id}`, { auth: true });
    assert.equal(removed.status, 204);
    const gone = await api("GET", `/api/events/${event.id}`);
    assert.equal(gone.status, 404);
  });
});

describe("pendaftaran", () => {
  test("kuota, email ganda, dan kapasitas", async () => {
    const event = await createEvent({ title: "Acara kuota dua", capacity: 2 });

    const first = await register(event.id, "Budi Santoso", "  Budi@Example.com ");
    assert.equal(first.status, 201);
    assert.equal(first.body.data.email, "budi@example.com");

    const duplicate = await register(event.id, "Budi Lagi", "budi@example.com");
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.error.code, "ALREADY_REGISTERED");

    assert.equal((await register(event.id, "Siti Rahma", "siti@example.com")).status, 201);

    const full = await register(event.id, "Andi Pratama", "andi@example.com");
    assert.equal(full.status, 409);
    assert.equal(full.body.error.code, "EVENT_FULL");

    const shrink = await api("PUT", `/api/events/${event.id}`, {
      auth: true,
      body: {
        title: event.title,
        host: event.host,
        location: event.location,
        startsAt: wib(10, 13),
        endsAt: wib(10, 15),
        capacity: 1,
      },
    });
    assert.equal(shrink.status, 409);
    assert.equal(shrink.body.error.code, "CAPACITY_BELOW_REGISTERED");

    const list = await api("GET", `/api/events/${event.id}/registrations`);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.length, 2);
    if (PASSWORD) assert.equal(list.body.data[0].email, "bu***@example.com");

    const removed = await api("DELETE", `/api/events/${event.id}/registrations/${first.body.data.id}`, { auth: true });
    assert.equal(removed.status, 204);
    assert.equal((await register(event.id, "Andi Pratama", "andi@example.com")).status, 201);
  });

  test("isian pendaftaran divalidasi", async () => {
    const event = await createEvent({ title: "Acara validasi daftar" });
    const response = await register(event.id, "B", "budi.example.com");
    assert.equal(response.status, 400);
    assert.ok(response.body.error.fields.name);
    assert.ok(response.body.error.fields.email);
  });

  test("pendaftaran ditutup untuk acara yang sudah selesai", async () => {
    const event = await createEvent({ title: "Acara kemarin", startsAt: wib(-2, 8), endsAt: wib(-2, 10) });
    const response = await register(event.id, "Datang Telat", "telat@example.com");
    assert.equal(response.status, 409);
    assert.equal(response.body.error.code, "EVENT_ENDED");
  });
});
