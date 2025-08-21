# ---- Deps Stage ----
FROM node:20-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      npm i -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci --no-audit --no-fund; \
    else \
      npm install --no-audit --no-fund; \
    fi

# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules

# ให้ Next เห็น env ตอน build (อย่าลืม !.env.frontend ใน .dockerignore)
COPY .env.frontend .env

COPY . .
RUN npm run build

# prune prod deps
RUN if [ -f pnpm-lock.yaml ]; then \
      npm i -g pnpm && pnpm prune --prod; \
    elif [ -f yarn.lock ]; then \
      yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm prune --omit=dev; \
    else \
      npm prune --omit=dev; \
    fi

# ---- Runtime Stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ให้คอนเทนเนอร์ฟังพอร์ต 4001 ให้ตรงกับ compose
ENV PORT=4001

RUN addgroup -S nextjs && adduser -S nextjs -G nextjs \
 && apk add --no-cache wget

COPY --chown=nextjs:nextjs --from=builder /app/.next ./.next
COPY --chown=nextjs:nextjs --from=builder /app/public ./public
COPY --chown=nextjs:nextjs --from=builder /app/package*.json ./
COPY --chown=nextjs:nextjs --from=builder /app/node_modules ./node_modules

USER nextjs
EXPOSE 4001
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:$PORT" >/dev/null 2>&1 || exit 1

# ต้องมี "start": "next start" ใน package.json
CMD ["npm","start"]
