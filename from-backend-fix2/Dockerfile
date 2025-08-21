# ===== Backend (Laravel) on PHP 8.3 CLI (Alpine) =====
FROM php:8.3-cli-alpine

WORKDIR /app

# System & PHP extensions
RUN apk add --no-cache \
      tzdata git curl unzip ca-certificates \
      $PHPIZE_DEPS build-base pkgconf \
      icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      bzip2-dev xz-dev zlib-dev zstd-dev \
      mariadb-client \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install -j"$(nproc)" \
      pdo_mysql mbstring zip exif gd intl bcmath \
  && rm -rf /var/cache/apk/*

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# Composer env (เพิ่ม timeout ให้ยาวๆ เผื่อเคสเน็ตช้า)
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=1800 \
    TZ=Asia/Bangkok

# ติดตั้ง vendor จาก lock (cache-friendly)
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-scripts

# คัดลอกโค้ด
COPY . .

# finalize vendors (autoload/psr)
RUN composer install --no-interaction --prefer-dist \
 && composer dump-autoload -o

# ตรวจ Seeder class (optional)
RUN php -r "require 'vendor/autoload.php'; \
  if(!class_exists('Database\\\\Seeders\\\\DatabaseSeeder')){ \
    fwrite(STDERR, \"[build] WARN: Database\\\\Seeders\\\\DatabaseSeeder NOT FOUND.\\n\"); \
  } else { echo \"[build] Seeders OK\\n\"; }"

# ===== ENTRYPOINT: ไม่แตะ composer ตอน runtime =====
RUN cat > /usr/local/bin/entrypoint.sh <<'SH' \
 && chmod 0755 /usr/local/bin/entrypoint.sh
#!/bin/sh
set -Eeuo pipefail
set -x

echo "[entry] START $(date -Iseconds)"
echo "[entry] APP_PORT=${APP_PORT-<unset>} RUN_MIGRATIONS=${RUN_MIGRATIONS-<unset>} RUN_SEEDER=${RUN_SEEDER-<unset>}"

: "${APP_PORT:?Missing APP_PORT (.env BACKEND_PORT)}"
: "${RUN_MIGRATIONS:=1}"
: "${RUN_SEEDER:=1}"

php -v | head -n1

# ไม่ทำ composer install ที่ runtime เด็ดขาด
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[entry] ERROR: vendor ไม่อยู่ใน image (ต้อง build ใหม่)"; exit 90
fi

# APP_KEY ถ้ายังไม่มีใน .env
if [ -z "${APP_KEY:-}" ] && [ -f .env ] && ! grep -qE '^APP_KEY=.+$' .env; then
  echo "[entry] key:generate"
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan key:generate --force --ansi || true
fi

# permission
chmod -R ug+rwX storage bootstrap/cache || true

# clear caches
echo "[entry] clear caches"
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan config:clear || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan cache:clear  || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan route:clear  || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan view:clear   || true

# (ถ้าต้องรอ DB ให้เติมบล็อครอตรงนี้)

# migrate / seed
if [ "${RUN_MIGRATIONS}" = "1" ]; then
  echo "[entry] ===== RUN MIGRATIONS ====="
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan migrate --force --no-interaction || true
fi
if [ "${RUN_SEEDER}" = "1" ]; then
  echo "[entry] ===== RUN SEEDERS ====="
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan db:seed --force --no-interaction || true
fi

# caches & serve
echo "[entry] rebuild caches"
php artisan storage:link || true
php artisan cache:clear  || true
php artisan config:cache || true
php artisan route:cache  || true
php artisan view:cache   || true
php artisan optimize     || true

echo "[entry] SERVE 0.0.0.0:${APP_PORT}"
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
SH

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
