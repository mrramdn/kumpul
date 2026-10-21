# Image service web: Next.js yang melayani halaman dan REST API dalam satu proses.
# Tiga tahap: deps memasang paket, build menghasilkan .next/standalone, runtime hanya membawa hasil build.
ARG NODE_VERSION=26.12.0

FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
# npm 11.20 tidak menjalankan skrip instalasi paket kecuali diizinkan; pnpm butuh skripnya untuk memasang binary.
RUN npm install --global --allow-scripts=pnpm pnpm@12.8.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Jalan sebagai user biasa (node, uid 1000), bukan root.
USER node
EXPOSE 3000
CMD ["node", "server.js"]
