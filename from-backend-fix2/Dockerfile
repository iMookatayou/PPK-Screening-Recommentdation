# ===== Backend (Laravel) on PHP 8.3 CLI (Alpine) =====
FROM php:8.3-cli-alpine

WORKDIR /app

# ===== System & PHP extensions =====
RUN apk add --no-cache \
      tzdata git curl unzip ca-certificates \
      $PHPIZE_DEPS build-base pkgconf \
      icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      bzip2-dev xz-dev zlib-dev zstd-dev \
      mariadb-client \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring zip exif gd intl bcmath \
 && rm -rf /var/cache/apk/*

# ===== Composer (from official image) =====
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# (optional) Composer mirror/token
ARG PACKAGIST=https://packagist.org
ARG GITHUB_TOKEN=
RUN composer config -g repos.packagist composer "${PACKAGIST}" \
 && if [ -n "${GITHUB_TOKEN}" ]; then composer config -g github-oauth.github.com "${GITHUB_TOKEN}"; fi

ENV TZ=Asia/Bangkok \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=1800

# ===== Install vendors (round 1: no-scripts) =====
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-dev -o --no-scripts

# ===== Copy app source =====
COPY . .

# ===== Finalize vendors =====
RUN composer dump-autoload -o \
 && php artisan package:discover --ansi || true

# ===== Entrypoint (serve + migrate/seed/caches) =====
RUN cat > /usr/local/bin/entrypoint.sh <<'SH' \
 && chmod +x /usr/local/bin/entrypoint.sh
#!/bin/sh
set -e

: "${APP_PORT:=4002}"
: "${RUN_MIGRATIONS:=1}"
: "${RUN_SEEDER:=0}"

echo "[entry] Start $(date -Iseconds)"
echo "[entry] APP_PORT=$APP_PORT RUN_MIGRATIONS=$RUN_MIGRATIONS RUN_SEEDER=$RUN_SEEDER"

# --- create required dirs ---
mkdir -p \
  storage/framework/cache \
  storage/framework/sessions \
  storage/framework/testing \
  storage/framework/views \
  bootstrap/cache

# --- try proper ownership first (www-data) ---
WEB_USER="www-data"
if ! id www-data >/dev/null 2>&1; then
  # Alpine CLI ไม่มี www-data? สร้างให้
  addgroup -g 82 -S www-data || true
  adduser  -u 82 -D -S -G www-data www-data || true
fi

# บาง FS (เช่น Windows bind mount) อาจไม่รองรับ chown → ไม่ fail ถ้าทำไม่ได้
chown -R "$WEB_USER:$WEB_USER" storage bootstrap/cache || true
chmod -R ug+rwX storage bootstrap/cache || true

# ถ้ายังเขียนไม่ได้ ให้ fallback 777 (เฉพาะสองโฟลเดอร์นี้)
touch storage/.perm_test 2>/dev/null || {
  echo "[entry] fallback chmod 777 (bind-mount/permission issue detected)"
  chmod -R 777 storage bootstrap/cache || true
}
rm -f storage/.perm_test 2>/dev/null || true

echo "[entry] clearing caches…"
php artisan config:clear || { echo "[entry] config:clear failed"; ls -la bootstrap/cache || true; exit 1; }
php artisan cache:clear  || { echo "[entry] cache:clear failed";  ls -la storage/framework/cache || true; exit 1; }
php artisan route:clear  || { echo "[entry] route:clear failed";  exit 1; }
php artisan view:clear   || { echo "[entry] view:clear failed";   ls -la storage/framework/views || true; exit 1; }

# generate key if missing (ถ้าคุณใช้ APP_KEY อยู่แล้ว บรรทัดนี้จะข้าม)
if [ -z "${APP_KEY:-}" ] && [ -f .env ] && ! grep -qE '^APP_KEY=.+$' .env; then
  php artisan key:generate --force --ansi || true
fi

# migrate/seed
if [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "[entry] Running migrations..."
  php artisan migrate --force --no-interaction || true
fi
if [ "$RUN_SEEDER" = "1" ]; then
  echo "[entry] Running seeders..."
  php artisan db:seed --force --no-interaction || true
fi

# cache & optimize (ไม่ต้อง fail ถ้าค้าง)
php artisan storage:link || true
php artisan config:cache || true
php artisan route:cache  || true
php artisan view:cache   || true
php artisan optimize     || true

echo "[entry] Serve on 0.0.0.0:$APP_PORT"
exec php artisan serve --host=0.0.0.0 --port="$APP_PORT"
SH

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

EXPOSE 4002
