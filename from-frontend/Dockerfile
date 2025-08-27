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

# นำ node_modules จาก stage ก่อนหน้าเข้ามา
COPY --from=deps /app/node_modules ./node_modules

# คัดลอกโค้ดทั้งหมด (รวม .env) — ต้องแน่ใจว่า .dockerignore ไม่ block .env
COPY . .

# สร้าง production build — Next.js จะอ่านไฟล์ .env ที่ถูก COPY มาแล้ว
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# ตั้งค่า PORT runtime (ค่า default 4001)
ENV PORT=4001

# เพิ่ม user ที่ไม่ใช่ root และ wget สำหรับ healthcheck
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs \
 && apk add --no-cache wget

# คัดลอกไฟล์ที่จำเป็นสำหรับ runtime
COPY --chown=nextjs:nextjs package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      npm i -g pnpm && pnpm install --prod --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --production --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci --omit=dev --no-audit --no-fund; \
    else \
      npm install --omit=dev --no-audit --no-fund; \
    fi

COPY --chown=nextjs:nextjs --from=builder /app/.next ./.next
COPY --chown=nextjs:nextjs --from=builder /app/public ./public
COPY --chown=nextjs:nextjs --from=builder /app/next.config.js ./next.config.js
# คัดลอก .env มาด้วย (ไม่จำเป็นต่อการรัน ถ้าไม่อยากก็ลบบรรทัดนี้ได้)
COPY --chown=nextjs:nextjs --from=builder /app/.env ./.env

USER nextjs
EXPOSE 4001

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://localhost:${PORT}" >/dev/null 2>&1 || exit 1

# ต้องมี "start": "next start" ใน package.json
CMD ["npm","start"]
