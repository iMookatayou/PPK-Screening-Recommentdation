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

# ===== Install vendors (round 1: no-scripts, because artisan not copied yet) =====
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-dev -o --no-scripts

# ===== Copy app source =====
COPY . .

# ===== Finalize vendors (round 2 or manual hooks) =====
# วิธี A: รันสคริปต์ที่ถูกปิดด้วยมือ (เร็วและชัดเจน)
RUN composer dump-autoload -o \
 && php artisan package:discover --ansi || true

# (ทางเลือก วิธี B: ใช้ install อีกรอบเพื่อให้สคริปต์รันเอง — คอมเมนต์ไว้เผื่อเลือกใช้)
# RUN composer install --no-interaction --prefer-dist --no-dev -o

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

# permissions
chmod -R ug+rwX storage bootstrap/cache || true

# clear caches
php artisan config:clear || true
php artisan cache:clear  || true
php artisan route:clear  || true
php artisan view:clear   || true

# generate key if missing
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

# cache & optimize
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
