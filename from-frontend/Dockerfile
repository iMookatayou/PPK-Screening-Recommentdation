# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \
  if [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then npm install -g pnpm && pnpm install; \
  elif [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  else npm install; fi

# Copy source code
COPY . .

# Optional: copy env file if exists
# COPY .env.production .env.production

# Build the Next.js app
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next .next
COPY --from=builder /app/public public
COPY --from=builder /app/package.json package.json
COPY --from=builder /app/next.config.ts next.config.ts
COPY --from=builder /app/node_modules node_modules

# Optional: copy .env.production if exists
# COPY --from=builder /app/.env.production .env.production

EXPOSE 3000
CMD ["npm", "start"]
