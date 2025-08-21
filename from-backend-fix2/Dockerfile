# ===== Backend (Laravel) on PHP 8.3 CLI (Alpine) =====
FROM php:8.3-cli-alpine

WORKDIR /app

# ===== System & PHP extensions =====
# ต้องมี $PHPIZE_DEPS + build-base สำหรับคอมไพล์บน Alpine
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

# ===== Composer (from official image) =====
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

# ===== Composer env =====
ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    TZ=Asia/Bangkok

# ===== Install vendors from lock first (cache-friendly) =====
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-scripts

# ===== Copy source =====
COPY . .

# ===== Finalize vendors (autoload/psr) =====
RUN composer install --no-interaction --prefer-dist \
 && composer dump-autoload -o

# ===== Seed class presence check (optional) =====
RUN php -r "require 'vendor/autoload.php'; \
  if(!class_exists('Database\\\\Seeders\\\\DatabaseSeeder')){ \
    fwrite(STDERR, \"[build] WARN: Database\\\\Seeders\\\\DatabaseSeeder NOT FOUND.\\n\"); \
  } else { echo \"[build] Seeders OK\\n\"; }"

# ===== Embed entrypoint (no external COPY needed) =====
RUN cat > /usr/local/bin/entrypoint.sh <<'SH' \
 && chmod 0755 /usr/local/bin/entrypoint.sh
#!/bin/sh
set -Eeuo pipefail

: "${APP_PORT:?Missing APP_PORT (.env BACKEND_PORT)}"
: "${RUN_MIGRATIONS:=1}"
: "${RUN_SEEDER:=1}"

echo "========== [backend] entrypoint =========="
echo "[backend] PHP: $(php -v | head -n1)"
echo "[backend] APP_PORT=${APP_PORT}"

# 1) vendors
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[backend] vendor missing -> composer install"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
fi
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# 2) APP_KEY (ถ้า .env ยังไม่มี)
if [ -z "${APP_KEY:-}" ] && [ -f .env ] && ! grep -qE '^APP_KEY=.+$' .env; then
  echo "[backend] generating APP_KEY"
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan key:generate --force --ansi || true
fi

# 3) permissions
chmod -R ug+rwX storage bootstrap/cache || true

# 4) clear caches (safe)
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan config:clear || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan cache:clear  || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan route:clear  || true
CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan view:clear   || true

# 5) (optional) wait DB here if needed
# if [ "${DB_CONNECTION:-mysql}" != "sqlite" ] && [ -n "${DB_HOST:-}" ] && [ -n "${DB_PORT:-}" ]; then
#   command -v mysqladmin >/dev/null 2>&1 || apk add --no-cache mariadb-client
#   echo "[backend] waiting DB ${DB_HOST}:${DB_PORT} ..."
#   timeout="${DB_WAIT_TIMEOUT:-120}"; interval="${DB_WAIT_INTERVAL:-2}"; elapsed=0
#   until MYSQL_PWD="${DB_PASSWORD:-}" mysqladmin ping --protocol=tcp -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USERNAME:-root}" --silent >/dev/null 2>&1; do
#     elapsed=$((elapsed+interval))
#     [ "$elapsed" -ge "$timeout" ] && echo "[backend] ERROR: DB not ready after ${timeout}s" && exit 1
#     sleep "${interval}"
#   done
#   echo "[backend] DB is up"
#   if [ -n "${DB_DATABASE:-}" ]; then
#     echo "[backend] ensure database ${DB_DATABASE}"
#     MYSQL_PWD="${DB_PASSWORD:-}" mysql -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USERNAME:-root}" \
#       -e "CREATE DATABASE IF NOT EXISTS \`${DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
#   fi
# fi

# 6) migrate / seed
if [ "${RUN_MIGRATIONS}" = "1" ]; then
  echo "[backend] ===== RUN MIGRATIONS ====="
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan migrate --force --no-interaction || true
fi
if [ "${RUN_SEEDER}" = "1" ]; then
  echo "[backend] ===== RUN SEEDERS ====="
  CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan db:seed --force --no-interaction || true
fi

# 7) link & caches
php artisan storage:link || true
php artisan cache:clear  || true
php artisan config:cache || true
php artisan route:cache  || true
php artisan view:cache   || true
php artisan optimize     || true

echo "========== [backend] starting Laravel server on 0.0.0.0:${APP_PORT} =========="
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
SH

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
