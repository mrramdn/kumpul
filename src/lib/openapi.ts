import { dictionaries, type Lang } from "@/i18n";
import type { ErrorCode } from "@/i18n/id";

// Spesifikasi OpenAPI 3.1 untuk REST API Kumpul, dalam bahasa Indonesia atau Inggris.
// Dipakai halaman /api/docs dan bisa diunduh dari /api/openapi.json.
// Kalau menambah atau mengubah endpoint, ubah juga file ini.

export type OpenApiDocument = ReturnType<typeof buildOpenApi>;

export function buildOpenApi(lang: Lang) {
  const t = dictionaries[lang];
  const L = (id: string, en: string) => (lang === "id" ? id : en);

  const uuidParam = (name: string, description: string) => ({
    name,
    in: "path",
    required: true,
    description,
    schema: { type: "string", format: "uuid" },
  });

  const errorResponse = (description: string, code: ErrorCode, values: Record<string, string> = {}) => ({
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
        example: {
          error: { code, message: t.errors[code].replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match) },
        },
      },
    },
  });

  const dataOf = (schema: object) => ({ type: "object", required: ["data"], properties: { data: schema } });
  const ok = (description: string, schema: object, example?: unknown) => ({
    description,
    content: { "application/json": { schema: dataOf(schema), ...(example ? { example: { data: example } } : {}) } },
  });
  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const auth = [{ session: [] }];

  const validation = {
    description: L(
      "Isian tidak valid; `fields` berisi pesan per isian.",
      "Invalid input; `fields` holds a message per field.",
    ),
    content: {
      "application/json": {
        schema: ref("Error"),
        example: {
          error: {
            code: "VALIDATION_ERROR",
            message: t.errors.VALIDATION_ERROR,
            fields: { title: t.validation.min.replace("{label}", t.fields.title).replace("{min}", "3") },
          },
        },
      },
    },
  };
  const unauthorized = errorResponse(L("Belum masuk.", "Not logged in."), "UNAUTHORIZED");
  const notOwner = errorResponse(
    L("Bukan pemilik acara ini dan bukan admin.", "Neither this event's owner nor an admin."),
    "NOT_EVENT_OWNER",
  );
  const eventNotFound = errorResponse(L("Acara tidak ditemukan.", "Event not found."), "EVENT_NOT_FOUND");
  const invalidId = errorResponse(L("ID bukan UUID.", "The ID is not a UUID."), "INVALID_ID", {
    label: t.fields.eventId,
  });

  const eventExample = {
    title: L("Workshop Docker Compose untuk Pemula", "Docker Compose workshop for beginners"),
    host: L("Himpunan Mahasiswa Informatika", "Informatics Student Association"),
    description: L("Service, network, volume, dan healthcheck.", "Services, networks, volumes and healthchecks."),
    location: L("Lab Komputer 3, Gedung B", "Computer Lab 3, Building B"),
    startsAt: "2026-11-05T13:00",
    endsAt: "2026-11-05T16:00",
    capacity: 30,
  };
  const userExample = {
    id: "5b0c9a1e-2f4d-4c1b-8e7a-6d3f2a1b0c9d",
    name: "Budi Santoso",
    email: "budi@example.com",
    isAdmin: false,
  };

  return {
    openapi: "3.1.0",
    info: {
      title: "Kumpul API",
      version: "2.0.0",
      description: L(
        [
          '- Respons sukses berbentuk `{ "data": ... }`, respons gagal `{ "error": { "code", "message", "fields" } }`.',
          "- Jam tanpa zona waktu (`2026-11-05T13:00`) dibaca sebagai WIB. Jam dengan zona waktu (`2026-11-05T06:00:00Z`) juga diterima. Respons selalu dalam UTC.",
          "- Login memakai cookie sesi HttpOnly `kumpul_session` dari `POST /api/session` atau `POST /api/users`. Dari terminal: `curl -c cookie.txt ...`, lalu `curl -b cookie.txt ...`.",
          "- Pesan error mengikuti bahasa pengguna: cookie `kumpul_lang` (`id` atau `en`), atau header `Accept-Language`.",
        ].join("\n"),
        [
          '- Successful responses look like `{ "data": ... }`, failed ones like `{ "error": { "code", "message", "fields" } }`.',
          "- Times without a time zone (`2026-11-05T13:00`) are read as WIB (UTC+7). Times with a zone (`2026-11-05T06:00:00Z`) are accepted too. Responses are always in UTC.",
          "- Login uses the HttpOnly session cookie `kumpul_session` from `POST /api/session` or `POST /api/users`. From a terminal: `curl -c cookie.txt ...`, then `curl -b cookie.txt ...`.",
          "- Error messages follow the user's language: the `kumpul_lang` cookie (`id` or `en`), or the `Accept-Language` header.",
        ].join("\n"),
      ),
    },
    tags: [
      {
        name: "Health",
        description: L(
          "Status layanan untuk healthcheck dan pemantauan.",
          "Service status for healthchecks and monitoring.",
        ),
      },
      {
        name: L("Akun", "Accounts"),
        description: L("Daftar, masuk, keluar, dan hapus akun.", "Sign up, log in, log out and delete an account."),
      },
      {
        name: L("Acara", "Events"),
        description: L("Membuat, menampilkan, mengubah, dan menghapus acara.", "Create, list, edit and delete events."),
      },
      {
        name: L("Pendaftaran", "Registrations"),
        description: L("Mendaftar ke acara dan membatalkannya.", "Register for events and cancel registrations."),
      },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Health"],
          summary: L("Cek web dan database", "Check web and database"),
          responses: {
            200: {
              description: L("Web dan database sehat.", "Web and database are healthy."),
              content: { "application/json": { schema: ref("Health") } },
            },
            503: {
              description: L(
                "Web jalan, tetapi database tidak bisa dihubungi.",
                "Web is up, but the database cannot be reached.",
              ),
              content: {
                "application/json": {
                  schema: ref("Health"),
                  example: {
                    status: "error",
                    web: "up",
                    database: "down",
                    environment: "production",
                    uptimeSeconds: 120,
                    time: "2026-10-21T06:00:00.000Z",
                  },
                },
              },
            },
          },
        },
      },
      "/api/users": {
        post: {
          tags: [L("Akun", "Accounts")],
          summary: L("Buat akun", "Create an account"),
          description: L(
            "Membuat akun lalu langsung masuk (cookie sesi dipasang).",
            "Creates an account and logs in (sets the session cookie).",
          ),
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("RegisterInput"),
                example: { name: "Budi Santoso", email: "budi@example.com", password: "rahasia-123" },
              },
            },
          },
          responses: {
            201: ok(
              L("Akun dibuat.", "Account created."),
              { type: "object", properties: { user: ref("User") } },
              { user: userExample },
            ),
            400: validation,
            409: errorResponse(L("Email sudah dipakai.", "The email is already used."), "EMAIL_TAKEN"),
          },
        },
      },
      "/api/users/me": {
        delete: {
          tags: [L("Akun", "Accounts")],
          summary: L("Hapus akun sendiri", "Delete your account"),
          description: L(
            "Acara, pendaftaran, dan sesi milik akun ini ikut terhapus.",
            "The account's events, registrations and sessions are deleted with it.",
          ),
          security: auth,
          responses: { 204: { description: L("Akun dihapus.", "Account deleted.") }, 401: unauthorized },
        },
      },
      "/api/session": {
        get: {
          tags: [L("Akun", "Accounts")],
          summary: L("Akun yang sedang masuk", "Current account"),
          responses: {
            200: ok(
              L("Akun yang sedang masuk, atau null.", "The logged-in account, or null."),
              { type: "object", properties: { user: { anyOf: [ref("User"), { type: "null" }] } } },
              { user: userExample },
            ),
          },
        },
        post: {
          tags: [L("Akun", "Accounts")],
          summary: L("Masuk", "Log in"),
          description: L(
            "Memasang cookie HttpOnly `kumpul_session` yang berlaku 30 hari.",
            "Sets the HttpOnly `kumpul_session` cookie, valid for 30 days.",
          ),
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: ref("LoginInput"),
                example: { email: "budi@example.com", password: "rahasia-123" },
              },
            },
          },
          responses: {
            200: ok(
              L("Berhasil masuk.", "Logged in."),
              { type: "object", properties: { user: ref("User") } },
              { user: userExample },
            ),
            400: validation,
            401: errorResponse(L("Email atau password salah.", "Wrong email or password."), "INVALID_CREDENTIALS"),
          },
        },
        delete: {
          tags: [L("Akun", "Accounts")],
          summary: L("Keluar", "Log out"),
          description: L(
            "Sesi dihapus dari database dan cookie dihapus.",
            "The session is deleted from the database and the cookie is cleared.",
          ),
          responses: { 204: { description: L("Sudah keluar.", "Logged out.") } },
        },
      },
      "/api/me/events": {
        get: {
          tags: [L("Akun", "Accounts")],
          summary: L("Acara saya", "My events"),
          description: L(
            "Acara yang diselenggarakan dan yang diikuti akun yang sedang masuk.",
            "Events the logged-in account organises and attends.",
          ),
          security: auth,
          responses: {
            200: ok(L("Dua daftar acara.", "Two lists of events."), {
              type: "object",
              properties: {
                organizing: { type: "array", items: ref("Event") },
                attending: { type: "array", items: ref("Event") },
              },
            }),
            401: unauthorized,
          },
        },
      },
      "/api/events": {
        get: {
          tags: [L("Acara", "Events")],
          summary: L("Daftar acara", "List events"),
          parameters: [
            {
              name: "when",
              in: "query",
              description: L(
                "upcoming = belum selesai (termasuk yang sedang berlangsung), past = sudah selesai.",
                "upcoming = not ended yet (including events in progress), past = ended.",
              ),
              schema: { type: "string", enum: ["upcoming", "past", "all"], default: "all" },
            },
          ],
          responses: {
            200: ok(L("Daftar acara, urut dari yang paling dekat.", "Events, nearest first."), {
              type: "array",
              items: ref("Event"),
            }),
            400: errorResponse(L("Nilai when tidak dikenal.", "Unknown when value."), "INVALID_FILTER"),
          },
        },
        post: {
          tags: [L("Acara", "Events")],
          summary: L("Buat acara", "Create an event"),
          description: L(
            "Akun yang sedang masuk menjadi pemilik acara.",
            "The logged-in account becomes the event's owner.",
          ),
          security: auth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref("EventInput"), example: eventExample } },
          },
          responses: {
            201: ok(
              L(
                "Acara dibuat. Header Location berisi alamatnya.",
                "Event created. The Location header holds its address.",
              ),
              ref("Event"),
            ),
            400: validation,
            401: unauthorized,
          },
        },
      },
      "/api/events/{id}": {
        parameters: [uuidParam("id", t.fields.eventId)],
        get: {
          tags: [L("Acara", "Events")],
          summary: L("Detail acara", "Get an event"),
          responses: { 200: ok(L("Detail acara.", "The event."), ref("Event")), 400: invalidId, 404: eventNotFound },
        },
        put: {
          tags: [L("Acara", "Events")],
          summary: L("Ubah acara", "Update an event"),
          description: L(
            "Hanya pemilik acara atau admin. Semua isian dikirim ulang.",
            "Owner or admin only. Send every field again.",
          ),
          security: auth,
          requestBody: {
            required: true,
            content: { "application/json": { schema: ref("EventInput"), example: eventExample } },
          },
          responses: {
            200: ok(L("Acara setelah diubah.", "The updated event."), ref("Event")),
            400: validation,
            401: unauthorized,
            403: notOwner,
            404: eventNotFound,
            409: errorResponse(
              L("Kapasitas lebih kecil dari jumlah peserta.", "Capacity below the number of attendees."),
              "CAPACITY_BELOW_REGISTERED",
              { count: "3" },
            ),
          },
        },
        delete: {
          tags: [L("Acara", "Events")],
          summary: L("Hapus acara", "Delete an event"),
          description: L(
            "Hanya pemilik acara atau admin. Pendaftarnya ikut terhapus.",
            "Owner or admin only. Its registrations are deleted too.",
          ),
          security: auth,
          responses: {
            204: { description: L("Acara dihapus.", "Event deleted.") },
            401: unauthorized,
            403: notOwner,
            404: eventNotFound,
          },
        },
      },
      "/api/events/{id}/registrations": {
        parameters: [uuidParam("id", t.fields.eventId)],
        get: {
          tags: [L("Pendaftaran", "Registrations")],
          summary: L("Daftar peserta", "List attendees"),
          description: L(
            "Email lengkap hanya untuk pemilik acara dan admin; yang lain melihat versi disamarkan.",
            "Full emails for the event's owner and admins only; others see a masked version.",
          ),
          responses: {
            200: ok(L("Peserta, urut dari yang paling awal mendaftar.", "Attendees, earliest first."), {
              type: "array",
              items: ref("Registration"),
            }),
            404: eventNotFound,
          },
        },
        post: {
          tags: [L("Pendaftaran", "Registrations")],
          summary: L("Daftar ke acara", "Register for an event"),
          description: L(
            "Akun yang sedang masuk mendaftarkan dirinya. Tanpa body.",
            "The logged-in account registers itself. No body.",
          ),
          security: auth,
          responses: {
            201: ok(L("Berhasil terdaftar.", "Registered."), ref("Registration")),
            401: unauthorized,
            404: eventNotFound,
            409: errorResponse(
              L(
                "Sudah terdaftar (ALREADY_REGISTERED), kuota penuh (EVENT_FULL), atau acara sudah selesai (EVENT_ENDED).",
                "Already registered (ALREADY_REGISTERED), full (EVENT_FULL) or ended (EVENT_ENDED).",
              ),
              "EVENT_FULL",
            ),
          },
        },
      },
      "/api/events/{id}/registrations/{registrationId}": {
        parameters: [uuidParam("id", t.fields.eventId), uuidParam("registrationId", t.fields.registrationId)],
        delete: {
          tags: [L("Pendaftaran", "Registrations")],
          summary: L("Batalkan atau hapus pendaftaran", "Cancel or remove a registration"),
          description: L(
            "Oleh peserta itu sendiri, pemilik acara, atau admin.",
            "By the attendee, the event's owner or an admin.",
          ),
          security: auth,
          responses: {
            204: { description: L("Pendaftaran dihapus.", "Registration removed.") },
            401: unauthorized,
            403: notOwner,
            404: errorResponse(L("Pendaftaran tidak ditemukan.", "Registration not found."), "REGISTRATION_NOT_FOUND"),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        session: {
          type: "apiKey",
          in: "cookie",
          name: "kumpul_session",
          description: L(
            "Cookie sesi dari POST /api/session atau POST /api/users.",
            "Session cookie from POST /api/session or POST /api/users.",
          ),
        },
      },
      schemas: {
        RegisterInput: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", minLength: 2, maxLength: 80, description: t.fields.name },
            email: {
              type: "string",
              format: "email",
              maxLength: 160,
              description: L("Satu email untuk satu akun.", "One email per account."),
            },
            password: {
              type: "string",
              minLength: 8,
              maxLength: 200,
              description: L("Disimpan sebagai hash scrypt.", "Stored as a scrypt hash."),
            },
          },
        },
        LoginInput: {
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            isAdmin: {
              type: "boolean",
              description: L("Admin dapat mengelola acara siapa pun.", "Admins can manage any event."),
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        EventInput: {
          type: "object",
          required: ["title", "host", "location", "startsAt", "endsAt"],
          properties: {
            title: { type: "string", minLength: 3, maxLength: 120, description: t.fields.title },
            host: {
              type: "string",
              minLength: 2,
              maxLength: 80,
              description: L("Nama penyelenggara yang ditampilkan.", "Organiser name shown on the event."),
            },
            description: { type: "string", maxLength: 2000, default: "", description: t.fields.description },
            location: { type: "string", minLength: 2, maxLength: 160, description: t.fields.location },
            startsAt: {
              type: "string",
              description: L(
                "`YYYY-MM-DDTHH:mm` (WIB) atau ISO 8601 dengan zona waktu.",
                "`YYYY-MM-DDTHH:mm` (WIB) or ISO 8601 with a time zone.",
              ),
            },
            endsAt: { type: "string", description: L("Harus setelah startsAt.", "Must be after startsAt.") },
            capacity: {
              type: ["integer", "null"],
              minimum: 1,
              maximum: 10000,
              default: null,
              description: L("null = tidak dibatasi.", "null = unlimited."),
            },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            ownerId: { type: "string", format: "uuid", description: L("Akun pemilik acara.", "The owning account.") },
            title: { type: "string" },
            host: { type: "string" },
            description: { type: "string" },
            location: { type: "string" },
            startsAt: { type: "string", format: "date-time" },
            endsAt: { type: "string", format: "date-time" },
            capacity: { type: ["integer", "null"] },
            registeredCount: { type: "integer" },
            firstAttendees: {
              type: "array",
              items: { type: "string" },
              description: L("Nama tiga peserta pertama.", "Names of the first three attendees."),
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Registration: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            eventId: { type: "string", format: "uuid" },
            userId: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: {
              type: "string",
              description: L(
                "Disamarkan kecuali untuk pemilik acara dan admin.",
                "Masked except for the event's owner and admins.",
              ),
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Health: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "error"] },
            web: { type: "string", enum: ["up"] },
            database: { type: "string", enum: ["up", "down"] },
            databaseLatencyMs: { type: "number" },
            environment: { type: "string" },
            uptimeSeconds: { type: "integer" },
            time: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message"],
              properties: {
                code: { type: "string" },
                message: { type: "string" },
                fields: { type: "object", additionalProperties: { type: "string" } },
              },
            },
          },
        },
      },
    },
  };
}
