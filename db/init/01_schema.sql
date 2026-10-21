-- Skema Kumpul. PostgreSQL menjalankan file di /docker-entrypoint-initdb.d hanya sekali,
-- saat volume db_data masih kosong. Untuk mengulang dari nol: docker compose down -v.

-- Id memakai UUID acak, bukan angka berurutan, supaya alamat acara (/acara/<id>) tidak bisa ditebak.
-- gen_random_uuid() sudah bawaan PostgreSQL sejak versi 13.

CREATE TABLE IF NOT EXISTS events (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(120) NOT NULL CHECK (length(trim(title)) >= 3),
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

CREATE INDEX IF NOT EXISTS events_starts_at_idx ON events (starts_at);
CREATE INDEX IF NOT EXISTS events_ends_at_idx ON events (ends_at);

CREATE TABLE IF NOT EXISTS registrations (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID         NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    name       VARCHAR(80)  NOT NULL CHECK (length(trim(name)) >= 2),
    email      VARCHAR(160) NOT NULL CHECK (email = lower(email) AND position('@' IN email) > 1),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT registrations_one_per_email UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS registrations_event_id_idx ON registrations (event_id);
