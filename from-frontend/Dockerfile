# ---- Deps Stage (install dev deps for build) ----
FROM node:20-alpine AS deps
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
# ติดตั้งตาม lockfile ที่พบ
RUN if [ -f pnpm-lock.yaml ]; then \
      npm i -g pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci --include=dev --no-audit --no-fund; \
    else \
      npm install --include=dev --no-audit --no-fund; \
    fi

# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# รับค่า public env (bake เข้า bundle ตอน build)
ARG NEXT_PUBLIC_USE_MOCK
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_CARD_API
ARG NEXT_PUBLIC_PPK11_API
ARG NEXT_PUBLIC_FORM_API
ENV NEXT_PUBLIC_USE_MOCK=${NEXT_PUBLIC_USE_MOCK}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL}
ENV NEXT_PUBLIC_CARD_API=${NEXT_PUBLIC_CARD_API}
ENV NEXT_PUBLIC_PPK11_API=${NEXT_PUBLIC_PPK11_API}
ENV NEXT_PUBLIC_FORM_API=${NEXT_PUBLIC_FORM_API}

# ใช้ node_modules จากสเตจ deps เพื่อ cache ดีขึ้น
COPY --from=deps /app/node_modules ./node_modules
# คัดลอกซอร์สทั้งหมดและ build
COPY . .
RUN npm run build

# Prune ให้เหลือเฉพาะ production deps (ลดขนาด image + เร็วตอนรัน)
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
ENV PORT=3000

# healthcheck ใช้ wget และรันด้วย user ที่ไม่ใช่ root
RUN apk add --no-cache wget \
 && addgroup -S nextjs && adduser -S nextjs -G nextjs

# คัดลอก artifact และ node_modules ที่ prune แล้ว (ไม่ต้องลงแพ็กเกจซ้ำ)
COPY --chown=nextjs:nextjs --from=builder /app/.next ./.next
COPY --chown=nextjs:nextjs --from=builder /app/public ./public
COPY --chown=nextjs:nextjs --from=builder /app/package*.json ./
COPY --chown=nextjs:nextjs --from=builder /app/pnpm-lock.yaml* ./
COPY --chown=nextjs:nextjs --from=builder /app/yarn.lock* ./
COPY --chown=nextjs:nextjs --from=builder /app/node_modules ./node_modules

USER nextjs

EXPOSE 4001
# ใช้ shell form เพื่อให้ $PORT ถูกขยายค่า "ตอนรัน"
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:$PORT" >/dev/null 2>&1 || exit 1

# ต้องมี "start": "next start" ใน package.json
CMD ["npm","start"]
