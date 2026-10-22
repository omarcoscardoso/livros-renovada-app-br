# Estágio 1: Build do Frontend (Vite + React + Tailwind v4)
FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json server.ts ./
COPY public ./public
COPY src ./src

RUN npm run build

# Estágio 2: Runtime de Produção para Google Cloud Run
FROM node:22-bookworm-slim AS runner

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       fontconfig \
       fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV GCP_PROJECT_ID=renovada-app-br
ENV GCS_BUCKET=livros-renovada-app-br

COPY --from=builder /app/package.json /app/package-lock.json /app/tsconfig.json /app/server.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/src ./src

RUN mkdir -p /app/storage/pdfs /app/storage/covers \
    && chown -R node:node /app

USER node

EXPOSE 8080

CMD ["./node_modules/.bin/tsx", "server.ts"]
