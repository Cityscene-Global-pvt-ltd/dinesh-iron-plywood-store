# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps

ENV TZ=Asia/Kolkata
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000 \
    TZ=Asia/Kolkata

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY . .

RUN mkdir -p /app \
    && chown -R node:node /app

USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
