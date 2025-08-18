# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# รับค่า public env เฉพาะตอน build แล้ว bake เข้า bundle
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

# ติดตั้ง deps สำหรับ build
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN if [ -f package-lock.json ]; then npm ci --include=dev; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --include=dev; \
    elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm install; fi

# คัดลอกซอร์สและ build
COPY . .
RUN npm run build

# ---- Runtime Stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# healthcheck ใช้ wget
RUN apk add --no-cache wget

# ติดตั้งเฉพาะ prod deps
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; \
    elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install --prod --frozen-lockfile; \
    elif [ -f yarn.lock ]; then yarn install --production --frozen-lockfile; \
    else npm install --omit=dev; fi

# คัดลอก artifact สำหรับรันจริง
COPY --from=builder /app/.next .next
COPY --from=builder /app/public public

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT} >/dev/null 2>&1 || exit 1

CMD ["npm", "start"]
