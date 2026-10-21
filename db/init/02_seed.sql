-- Data contoh supaya halaman tidak kosong saat pertama kali dijalankan.
-- Akun contoh tidak punya password (password_hash NULL), jadi tidak bisa dipakai masuk;
-- untuk mencoba, buat akun sendiri lewat halaman Daftar.
-- Jam acara dihitung dalam WIB dan relatif terhadap hari database dibuat, jadi selalu ada
-- acara yang akan datang dan satu acara yang sudah lewat.

INSERT INTO users (name, email) VALUES
    ('Himpunan Mahasiswa Informatika', 'hmif@kumpul.example'),
    ('Komunitas Cloud Kampus', 'cloud@kumpul.example'),
    ('Asisten Lab Cloud Services', 'asisten@kumpul.example'),
    ('Budi Santoso', 'budi.santoso@example.com'),
    ('Siti Rahma', 'siti.rahma@example.com'),
    ('Andi Pratama', 'andi.pratama@example.com'),
    ('Dewi Lestari', 'dewi.lestari@example.com'),
    ('Rizky Hidayat', 'rizky.hidayat@example.com'),
    ('Nadia Putri', 'nadia.putri@example.com');

WITH base AS (
    SELECT date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AS today
)
INSERT INTO events (owner_id, title, host, description, location, starts_at, ends_at, capacity)
SELECT u.id, v.title, v.host, v.description, v.location,
       (base.today + v.starts_in) AT TIME ZONE 'Asia/Jakarta',
       (base.today + v.ends_in) AT TIME ZONE 'Asia/Jakarta',
       v.capacity
FROM base, (VALUES
    (
        'hmif@kumpul.example',
        'Workshop Docker Compose untuk Pemula',
        'Himpunan Mahasiswa Informatika',
        'Pelatihan menjalankan aplikasi multi-container dengan Docker Compose: service, network, volume, dan healthcheck. Peserta diharapkan membawa laptop dengan Docker Desktop terpasang.',
        'Lab Komputer 3, Gedung B',
        interval '3 days 13 hours', interval '3 days 16 hours', 30
    ),
    (
        'cloud@kumpul.example',
        'Diskusi Karier Cloud Engineer',
        'Komunitas Cloud Kampus',
        'Diskusi bersama alumni yang bekerja sebagai cloud engineer mengenai lingkup pekerjaan, sertifikasi yang relevan, dan persiapan portofolio.',
        'Aula Lantai 2',
        interval '8 days 9 hours', interval '8 days 11 hours 30 minutes', 80
    ),
    (
        'asisten@kumpul.example',
        'Kelas Git dan GitHub untuk Kerja Kelompok',
        'Asisten Lab Cloud Services',
        'Materi branch, pull request, dan penyelesaian konflik merge untuk pengerjaan proyek kelompok.',
        'Online lewat Zoom',
        interval '12 days 19 hours', interval '12 days 21 hours', NULL
    ),
    (
        'asisten@kumpul.example',
        'Penataan Kabel Laboratorium Jaringan',
        'Asisten Lab Cloud Services',
        'Penataan kabel jaringan dan pelabelan port switch di laboratorium.',
        'Lab Jaringan, Gedung C',
        interval '-6 days 8 hours', interval '-6 days 11 hours', 12
    )
) AS v (owner_email, title, host, description, location, starts_in, ends_in, capacity)
JOIN users u ON u.email = v.owner_email;

INSERT INTO registrations (event_id, user_id)
SELECT e.id, u.id
FROM (VALUES
    ('Workshop Docker Compose untuk Pemula', 'budi.santoso@example.com'),
    ('Workshop Docker Compose untuk Pemula', 'siti.rahma@example.com'),
    ('Workshop Docker Compose untuk Pemula', 'andi.pratama@example.com'),
    ('Diskusi Karier Cloud Engineer', 'dewi.lestari@example.com'),
    ('Penataan Kabel Laboratorium Jaringan', 'rizky.hidayat@example.com'),
    ('Penataan Kabel Laboratorium Jaringan', 'nadia.putri@example.com')
) AS r (title, email)
JOIN events e ON e.title = r.title
JOIN users u ON u.email = r.email;
