# PHP CLI + extensions + composer + mariadb-client
FROM php:8.3-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
      bash git curl icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      mariadb-client \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install pdo pdo_mysql mbstring zip exif gd intl

# Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin --filename=composer

# ===== Composer รอบแรก (ยังไม่มี artisan) → ไม่รันสคริปต์ =====
COPY composer.json composer.lock* ./
RUN COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 \
    composer install --no-interaction --prefer-dist --no-scripts

# คัดลอกโปรเจกต์ทั้งหมด
COPY . .

# ===== Composer รอบสอง (มี artisan แล้ว) → รันสคริปต์ + dump autoload =====
RUN COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 \
    composer install --no-interaction --prefer-dist \
 && COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o

# ===== Build-time guard: seeders ต้องอยู่จริง ไม่งั้น fail =====
RUN php -r "require 'vendor/autoload.php'; \
  if(!class_exists('Database\\\\Seeders\\\\DatabaseSeeder')){ \
    fwrite(STDERR, \"Database\\\\Seeders\\\\DatabaseSeeder NOT FOUND. Check .dockerignore / paths.\\n\"); \
    exit(1);} \
  echo \"Seeders OK\\n\";"

# ===== Entrypoint =====
RUN <<'SH' /bin/sh -eux
cat >/usr/local/bin/entrypoint.sh <<'EOF'
#!/usr/bin/env bash
set -Eeuo pipefail

# ---- require envs (ห้าม default) ----
: "${APP_PORT:?[backend] ERROR: APP_PORT is required}"
: "${DB_HOST:?[backend] ERROR: DB_HOST is required}"
: "${DB_PORT:?[backend] ERROR: DB_PORT is required}"

echo "========== [backend] starting entrypoint =========="
echo "Time: $(date)"
echo "[backend] PHP: $(php -v | head -n1)"

echo "[backend] waiting for DB ${DB_HOST}:${DB_PORT} ..."
TRY=0
until MYSQL_PWD="${DB_PASSWORD:-root}" mysqladmin ping \
  --protocol=tcp -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USERNAME:-root}" --silent >/dev/null 2>&1
do
  TRY=$((TRY+1))
  if [[ "$TRY" -gt 60 ]]; then
    echo "[backend] ERROR: DB not ready after 120s"
    exit 1
  fi
  sleep 2
done
echo "[backend] DB is up"

# กันพลาดกรณีถูก mount โค้ดทับ vendor
if [[ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]]; then
  echo "[backend] vendor incomplete -> composer install"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
fi
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# APP_KEY: ใช้จาก env ถ้ามี; ถ้าไม่มีและมี .env อยู่ ค่อย generate
if [[ -n "${APP_KEY:-}" ]]; then
  echo "[backend] APP_KEY provided via env; skip key:generate"
elif [[ -f .env ]] && ! grep -q '^APP_KEY=' .env; then
  php artisan key:generate --force
fi

chmod -R ug+rwX storage bootstrap/cache || true

# DEBUG DB ที่ใช้จริง
php -r "require 'vendor/autoload.php'; \
  \$app=require 'bootstrap/app.php'; \
  \$k=\$app->make(Illuminate\Contracts\Console\Kernel::class); \
  \$k->bootstrap(); \
  echo \"[backend] Using DB: \".config('database.connections.mysql.host').':'.config('database.connections.mysql.database').PHP_EOL;"

# ===== Migrate → Seed → Cache =====
if [[ "${RUN_MIGRATIONS:-1}" = "1" ]]; then
  echo "[backend] running migrations ..."
  php artisan migrate --force --no-interaction
fi

if [[ "${RUN_SEEDER:-1}" = "1" ]]; then
  CLASS="${SEED_CLASS:-Database\\Seeders\\DatabaseSeeder}"
  echo "[backend] seeding class: ${CLASS}"
  php artisan db:seed --force --no-interaction --class="${CLASS}"
fi

# เคลียร์/แคช หลัง migrate+seed (กัน cache table error)
php artisan config:clear || true
php artisan cache:clear  || true
php artisan route:clear  || true
php artisan view:clear   || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "========== [backend] starting Laravel server =========="
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
EOF
chmod 0755 /usr/local/bin/entrypoint.sh
SH

CMD ["/usr/local/bin/entrypoint.sh"]
