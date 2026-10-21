// Spesifikasi OpenAPI 3.1 untuk REST API Kumpul. Ditampilkan oleh Swagger UI di /api/docs
// dan bisa diunduh dari /api/openapi.json. Kalau menambah atau mengubah endpoint, ubah juga file ini.

const uuidParam = (name: string, description: string) => ({
  name,
  in: "path",
  required: true,
  description,
  schema: { type: "string", format: "uuid" },
});

const errorResponse = (description: string, code: string, message: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { error: { code, message } },
    },
  },
});

const responses = {
  BadRequest: {
    description: "Input tidak valid. `fields` berisi pesan per isian.",
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
        example: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Terdapat isian yang belum valid.",
            fields: { title: "Judul minimal 3 karakter.", endsAt: "Waktu selesai harus setelah waktu mulai." },
          },
        },
      },
    },
  },
  Unauthorized: errorResponse(
    "Belum masuk sebagai penyelenggara.",
    "UNAUTHORIZED",
    "Masuk sebagai penyelenggara untuk mengelola acara.",
  ),
  EventNotFound: errorResponse("Acara tidak ditemukan.", "EVENT_NOT_FOUND", "Acara tidak ditemukan."),
  DatabaseUnavailable: errorResponse(
    "Database tidak bisa dihubungi.",
    "DATABASE_UNAVAILABLE",
    "Database tidak dapat dihubungi. Silakan coba beberapa saat lagi.",
  ),
};

const dataOf = (schema: object) => ({
  type: "object",
  required: ["data"],
  properties: { data: schema },
});

const eventExample = {
  title: "Workshop Docker Compose untuk Pemula",
  host: "Himpunan Mahasiswa Informatika",
  description: "Belajar service, network, volume, dan healthcheck.",
  location: "Lab Komputer 3, Gedung B",
  startsAt: "2026-11-05T13:00",
  endsAt: "2026-11-05T16:00",
  capacity: 30,
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Kumpul API",
    version: "1.0.0",
    description: [
      "REST API aplikasi pendaftaran acara Kumpul.",
      "",
      '- Respons sukses berbentuk `{ "data": ... }`, respons gagal `{ "error": { "code", "message", "fields" } }`.',
      "- Jam tanpa zona waktu (`2026-11-05T13:00`) dibaca sebagai WIB. Jam dengan zona waktu (`2026-11-05T06:00:00Z`) juga diterima. Respons selalu dalam UTC.",
      "- Membuat, mengubah, dan menghapus acara butuh login penyelenggara: tekan **Authorize** lalu isi password penyelenggara (Bearer), atau masuk dulu lewat halaman /masuk.",
      "- Pesan error mengikuti bahasa pengguna: cookie `kumpul_lang` (`id`/`en`) atau header `Accept-Language`.",
    ].join("\n"),
  },
  tags: [
    { name: "Health", description: "Status layanan untuk healthcheck Docker dan monitoring." },
    { name: "Acara", description: "Membuat, menampilkan, mengubah, dan menghapus acara." },
    { name: "Pendaftaran", description: "Peserta mendaftar ke acara." },
    { name: "Sesi", description: "Masuk dan keluar sebagai penyelenggara." },
  ],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Cek web dan database",
        responses: {
          200: {
            description: "Web dan database sehat.",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Health" } } },
          },
          503: {
            description: "Web jalan, tetapi database tidak bisa dihubungi.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Health" },
                example: {
                  status: "error",
                  web: "up",
                  database: "down",
                  environment: "local",
                  uptimeSeconds: 120,
                  time: "2026-10-21T06:00:00.000Z",
                },
              },
            },
          },
        },
      },
    },
    "/api/events": {
      get: {
        tags: ["Acara"],
        summary: "Daftar acara",
        parameters: [
          {
            name: "when",
            in: "query",
            description: "upcoming = belum selesai (termasuk yang sedang berlangsung), past = sudah selesai.",
            schema: { type: "string", enum: ["upcoming", "past", "all"], default: "all" },
          },
        ],
        responses: {
          200: {
            description: "Daftar acara, urut dari yang paling dekat.",
            content: {
              "application/json": { schema: dataOf({ type: "array", items: { $ref: "#/components/schemas/Event" } }) },
            },
          },
          400: errorResponse(
            "Nilai when tidak dikenal.",
            "INVALID_FILTER",
            "Parameter when harus bernilai upcoming, past, atau all.",
          ),
          503: responses.DatabaseUnavailable,
        },
      },
      post: {
        tags: ["Acara"],
        summary: "Buat acara",
        security: [{ organizerPassword: [] }, { organizerSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/EventInput" }, example: eventExample },
          },
        },
        responses: {
          201: {
            description: "Acara dibuat. Header Location berisi alamat acara baru.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Event" }) } },
          },
          400: responses.BadRequest,
          401: responses.Unauthorized,
          503: responses.DatabaseUnavailable,
        },
      },
    },
    "/api/events/{id}": {
      parameters: [uuidParam("id", "ID acara")],
      get: {
        tags: ["Acara"],
        summary: "Detail acara",
        responses: {
          200: {
            description: "Detail acara.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Event" }) } },
          },
          400: errorResponse(
            "ID bukan UUID.",
            "INVALID_ID",
            "ID acara harus berupa UUID, contoh: 3f2b8c1e-6a4d-4e0b-9c7a-2d5e8f1a0b3c.",
          ),
          404: responses.EventNotFound,
        },
      },
      put: {
        tags: ["Acara"],
        summary: "Ubah acara (semua isian dikirim ulang)",
        security: [{ organizerPassword: [] }, { organizerSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/EventInput" }, example: eventExample },
          },
        },
        responses: {
          200: {
            description: "Acara setelah diubah.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Event" }) } },
          },
          400: responses.BadRequest,
          401: responses.Unauthorized,
          404: responses.EventNotFound,
          409: errorResponse(
            "Kapasitas baru lebih kecil dari jumlah pendaftar.",
            "CAPACITY_BELOW_REGISTERED",
            "Kapasitas tidak boleh kurang dari jumlah peserta terdaftar (3 orang).",
          ),
        },
      },
      delete: {
        tags: ["Acara"],
        summary: "Hapus acara beserta pendaftarnya",
        security: [{ organizerPassword: [] }, { organizerSession: [] }],
        responses: {
          204: { description: "Acara dihapus." },
          401: responses.Unauthorized,
          404: responses.EventNotFound,
        },
      },
    },
    "/api/events/{id}/registrations": {
      parameters: [uuidParam("id", "ID acara")],
      get: {
        tags: ["Pendaftaran"],
        summary: "Daftar peserta",
        description: "Email disamarkan (`bu***@example.com`) kecuali untuk penyelenggara.",
        responses: {
          200: {
            description: "Peserta, urut dari yang paling awal mendaftar.",
            content: {
              "application/json": {
                schema: dataOf({ type: "array", items: { $ref: "#/components/schemas/Registration" } }),
              },
            },
          },
          404: responses.EventNotFound,
        },
      },
      post: {
        tags: ["Pendaftaran"],
        summary: "Daftar ke acara (tanpa login)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegistrationInput" },
              example: { name: "Budi Santoso", email: "budi@example.com" },
            },
          },
        },
        responses: {
          201: {
            description: "Berhasil terdaftar.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Registration" }) } },
          },
          400: responses.BadRequest,
          404: responses.EventNotFound,
          409: errorResponse(
            "Email sudah terdaftar (ALREADY_REGISTERED), kuota penuh (EVENT_FULL), atau acara sudah selesai (EVENT_ENDED).",
            "EVENT_FULL",
            "Kuota acara telah penuh.",
          ),
        },
      },
    },
    "/api/events/{id}/registrations/{registrationId}": {
      parameters: [uuidParam("id", "ID acara"), uuidParam("registrationId", "ID pendaftaran")],
      delete: {
        tags: ["Pendaftaran"],
        summary: "Hapus peserta dari acara",
        security: [{ organizerPassword: [] }, { organizerSession: [] }],
        responses: {
          204: { description: "Pendaftaran dihapus." },
          401: responses.Unauthorized,
          404: errorResponse(
            "Data pendaftaran tidak ditemukan.",
            "REGISTRATION_NOT_FOUND",
            "Data pendaftaran tidak ditemukan.",
          ),
        },
      },
    },
    "/api/session": {
      get: {
        tags: ["Sesi"],
        summary: "Apakah sedang masuk sebagai penyelenggara",
        responses: {
          200: {
            description: "Status sesi.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Session" }) } },
          },
        },
      },
      post: {
        tags: ["Sesi"],
        summary: "Masuk sebagai penyelenggara",
        description:
          "Kalau password benar, server memasang cookie HttpOnly `kumpul_penyelenggara` yang berlaku 7 hari.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["password"], properties: { password: { type: "string" } } },
            },
          },
        },
        responses: {
          200: {
            description: "Berhasil masuk.",
            content: { "application/json": { schema: dataOf({ $ref: "#/components/schemas/Session" }) } },
          },
          400: responses.BadRequest,
          401: errorResponse("Password salah.", "WRONG_PASSWORD", "Password penyelenggara salah."),
        },
      },
      delete: {
        tags: ["Sesi"],
        summary: "Keluar",
        responses: { 204: { description: "Cookie sesi dihapus." } },
      },
    },
  },
  components: {
    securitySchemes: {
      organizerPassword: {
        type: "http",
        scheme: "bearer",
        description: "Password penyelenggara (ORGANIZER_PASSWORD) sebagai Bearer token.",
      },
      organizerSession: { type: "apiKey", in: "cookie", name: "kumpul_penyelenggara" },
    },
    schemas: {
      EventInput: {
        type: "object",
        required: ["title", "host", "location", "startsAt", "endsAt"],
        properties: {
          title: { type: "string", minLength: 3, maxLength: 120 },
          host: { type: "string", minLength: 2, maxLength: 80, description: "Nama penyelenggara." },
          description: { type: "string", maxLength: 2000, default: "" },
          location: { type: "string", minLength: 2, maxLength: 160 },
          startsAt: { type: "string", description: "`YYYY-MM-DDTHH:mm` (WIB) atau ISO 8601 dengan zona waktu." },
          endsAt: { type: "string", description: "Harus setelah startsAt." },
          capacity: {
            type: ["integer", "null"],
            minimum: 1,
            maximum: 10000,
            default: null,
            description: "null = tanpa batas.",
          },
        },
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string" },
          host: { type: "string" },
          description: { type: "string" },
          location: { type: "string" },
          startsAt: { type: "string", format: "date-time" },
          endsAt: { type: "string", format: "date-time" },
          capacity: { type: ["integer", "null"] },
          registeredCount: { type: "integer" },
          firstAttendees: { type: "array", items: { type: "string" }, description: "Nama tiga pendaftar pertama." },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      RegistrationInput: {
        type: "object",
        required: ["name", "email"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 80 },
          email: {
            type: "string",
            format: "email",
            maxLength: 160,
            description: "Satu email hanya bisa mendaftar sekali per acara.",
          },
        },
      },
      Registration: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          eventId: { type: "string", format: "uuid" },
          name: { type: "string" },
          email: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Session: {
        type: "object",
        properties: {
          authEnabled: { type: "boolean", description: "false kalau ORGANIZER_PASSWORD kosong (mode terbuka)." },
          organizer: { type: "boolean" },
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
              code: {
                type: "string",
                examples: ["VALIDATION_ERROR", "EVENT_NOT_FOUND", "EVENT_FULL", "DATABASE_UNAVAILABLE"],
              },
              message: { type: "string" },
              fields: { type: "object", additionalProperties: { type: "string" } },
            },
          },
        },
      },
    },
  },
};
