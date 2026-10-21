-- Skema Kumpul. PostgreSQL menjalankan file di /docker-entrypoint-initdb.d hanya sekali,
-- saat volume db_data masih kosong. Untuk mengulang dari nol: docker compose down -v.

-- Id memakai UUID acak, bukan angka berurutan, supaya alamat acara (/acara/<id>) tidak bisa ditebak.
-- gen_random_uuid() sudah bawaan PostgreSQL sejak versi 13.

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(80)  NOT NULL CHECK (length(trim(name)) >= 2),
    email         VARCHAR(160) NOT NULL UNIQUE CHECK (email = lower(email) AND position('@' IN email) > 1),
    -- Hash scrypt dari password. NULL untuk akun contoh, yang tidak bisa dipakai masuk.
    password_hash TEXT,
    -- Admin boleh mengubah dan menghapus acara siapa pun. Hanya bisa diberikan lewat SQL di server
    -- (lihat README), tidak lewat aplikasi.
    is_admin      BOOLEAN      NOT NULL DEFAULT false,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Cookie hanya berisi token acak; yang disimpan di sini hash SHA-256-nya. Keluar = baris dihapus.
CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64)    PRIMARY KEY,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);

CREATE TABLE IF NOT EXISTS events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Akun yang membuat acara; hanya akun ini yang boleh mengubah dan menghapusnya.
    owner_id    UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title       VARCHAR(120) NOT NULL CHECK (length(trim(title)) >= 3),
    -- Nama penyelenggara yang ditampilkan, misalnya organisasi; tidak harus sama dengan nama akun.
    host        VARCHAR(80)  NOT NULL CHECK (length(trim(host)) >= 2),
    description TEXT         NOT NULL DEFAULT '' CHECK (length(description) <= 2000),
    location    VARCHAR(160) NOT NULL CHECK (length(trim(location)) >= 2),
    starts_at   TIMESTAMPTZ  NOT NULL,
    ends_at     TIMESTAMPTZ  NOT NULL,
    capacity    INTEGER      CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 10000),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT events_ends_after_starts CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS events_owner_id_idx ON events (owner_id);
CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);
CREATE INDEX IF NOT EXISTS events_ends_at_idx ON events (ends_at);

CREATE TABLE IF NOT EXISTS registrations (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID        NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT registrations_once_per_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS registrations_user_id_idx ON registrations (user_id);
