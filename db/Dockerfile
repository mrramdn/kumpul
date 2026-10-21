# Image service db: PostgreSQL resmi ditambah skema dan data contoh.
# Entrypoint Postgres menjalankan file di /docker-entrypoint-initdb.d satu kali, saat volume data masih kosong.
FROM postgres:16-alpine
COPY init/ /docker-entrypoint-initdb.d/
