# Bukti pengujian

Dijalankan pada 21 Oktober 2026 di laptop (Linux, Docker Engine 29.9.1, Docker Compose 5.6.0), dari kondisi bersih
(`docker compose down -v`, lalu `docker compose up -d --build --wait`). Password dibaca dari `.env` dan tidak
ditampilkan.

## 1. Stack berjalan

```console
$ docker compose ps
SERVICE   IMAGE        STATUS                    PORTS
db        kumpul-db    Up 50 seconds (healthy)   5432/tcp
web       kumpul-web   Up 44 seconds (healthy)   127.0.0.1:3000->3000/tcp
```

`db` tidak membuka port ke host (`5432/tcp` hanya di dalam jaringan Docker); `web` hanya di `127.0.0.1:3000`.

![Beranda](img/beranda.png)

## 2. Uji API otomatis

```console
$ docker compose --profile test run --rm uji
▶ layanan
  ✔ health: web dan database sehat (227.047165ms)
  ✔ dokumentasi API tersedia (500.849973ms)
✔ layanan (734.671837ms)
▶ acara
  ✔ daftar acara bisa dibaca tanpa login (83.126295ms)
  ✔ filter when yang tidak dikenal ditolak (18.081914ms)
  ✔ membuat acara tanpa login ditolak (34.566583ms)
  ✔ input tidak valid ditolak dengan pesan per isian (79.786247ms)
  ✔ waktu selesai harus setelah waktu mulai (38.11487ms)
  ✔ pesan error mengikuti bahasa (Accept-Language) (31.185825ms)
  ✔ body yang bukan JSON ditolak (25.170695ms)
  ✔ ID yang bukan UUID ditolak, ID yang tidak ada 404 (51.198952ms)
  ✔ CRUD: buat, baca, ubah, hapus (109.915803ms)
✔ acara (476.107911ms)
▶ pendaftaran
  ✔ kuota, email ganda, dan kapasitas (221.871843ms)
  ✔ isian pendaftaran divalidasi (42.824034ms)
  ✔ pendaftaran ditutup untuk acara yang sudah selesai (39.079838ms)
✔ pendaftaran (305.127686ms)
ℹ tests 14
ℹ suites 3
ℹ pass 14
ℹ fail 0
```

## 3. Input tidak valid

Judul terlalu pendek, penyelenggara kosong, dan waktu selesai sebelum waktu mulai:

```console
$ curl -s -X POST http://localhost:3000/api/events -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $ORGANIZER_PASSWORD" \
    -d '{"title":"ab","host":"","location":"Lab","startsAt":"2026-11-05T13:00","endsAt":"2026-11-05T12:00"}'
{"error":{"code":"VALIDATION_ERROR","message":"Terdapat isian yang belum valid.","fields":{"title":"Judul minimal 3 karakter.","host":"Penyelenggara wajib diisi.","endsAt":"Waktu selesai harus setelah waktu mulai."}}}
HTTP 400
```

Tanpa login penyelenggara:

```console
$ curl -s -X POST http://localhost:3000/api/events -H 'Content-Type: application/json' -d '{"title":"Tanpa login"}'
{"error":{"code":"UNAUTHORIZED","message":"Masuk sebagai penyelenggara untuk mengelola acara."}}
HTTP 401
```

## 4. Persistensi data

Acara dibuat, semua container dan jaringan dihapus, lalu stack dinyalakan lagi. Volume `db_data` tetap ada, dan
acaranya masih bisa dibaca:

```console
$ curl -s -X POST http://localhost:3000/api/events ... '{"title":"Uji persistensi", ...}'
id=786089aa-52ab-4468-8e4d-1cd971c5e791

$ docker compose down
 Container kumpul-web-1 Removed
 Container kumpul-db-1 Removed
 Network kumpul_frontend Removed
 Network kumpul_backend Removed
$ docker volume ls --format '{{.Name}}' | grep kumpul
kumpul_db_data
$ docker compose up -d --wait
 Container kumpul-db-1 Healthy
 Container kumpul-web-1 Healthy

$ curl -s http://localhost:3000/api/events/786089aa-52ab-4468-8e4d-1cd971c5e791
{"data":{"id":"786089aa-52ab-4468-8e4d-1cd971c5e791","title":"Uji persistensi","host":"Tim", ...}}
HTTP 200
```

## 5. Gangguan database dan pemulihan

```console
$ docker compose stop db
$ curl -s http://localhost:3000/api/health
{"status":"error","web":"up","database":"down","environment":"local","uptimeSeconds":8,"time":"2026-10-21T02:40:15.695Z"}
HTTP 503 0.022074s
$ curl -s 'http://localhost:3000/api/events?when=upcoming'
{"error":{"code":"DATABASE_UNAVAILABLE","message":"Database tidak dapat dihubungi. Silakan coba beberapa saat lagi."}}
HTTP 503 0.029767s

$ docker compose ps        # setelah tiga healthcheck gagal
SERVICE   STATUS
web       Up 43 seconds (unhealthy)

$ docker compose logs web --tail 2 --no-log-prefix
{"time":"2026-10-21T02:40:45.472Z","level":"warn","message":"health check: database tidak bisa dihubungi","error":"getaddrinfo EAI_AGAIN db"}
{"time":"2026-10-21T02:40:45.473Z","level":"error","message":"request","method":"GET","path":"/api/health","status":503,"durationMs":7.9}

$ docker compose start db
$ curl -s http://localhost:3000/api/health
{"status":"ok","web":"up","database":"up","databaseLatencyMs":1.8,"environment":"local","uptimeSeconds":49,"time":"2026-10-21T02:40:57.233Z"}
HTTP 200
$ docker compose ps
SERVICE   STATUS
db        Up 20 seconds (healthy)
web       Up About a minute (healthy)
```

API langsung membalas 503 (sekitar 25 ms, tidak menggantung), log menyebut penyebabnya (`EAI_AGAIN db`: nama
service `db` tidak ditemukan karena container-nya mati), healthcheck menandai `web` unhealthy, dan setelah database
menyala lagi semuanya pulih tanpa me-restart `web`. Di browser, halaman menampilkan pesan error dengan tombol
**Coba lagi**, dan indikator di footer berubah merah:

![Halaman saat database mati](img/database-mati.png)

## 6. Log

Satu baris JSON per request, dengan method, path, status, dan durasi:

```json
{"time":"2026-10-21T02:41:12.701Z","level":"info","message":"request","method":"DELETE","path":"/api/events/786089aa-52ab-4468-8e4d-1cd971c5e791","status":204,"durationMs":20.8}
```

## Tampilan lain

![Detail acara](img/detail-acara.png)

![Dokumentasi API](img/dokumentasi-api.png)

![Beranda di layar HP](img/beranda-hp.png)
