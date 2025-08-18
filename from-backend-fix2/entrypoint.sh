#!/bin/sh
set -euo pipefail

# ========= Require envs (no hard-coded defaults) =========
: "${APP_PORT:?[backend] ERROR: APP_PORT is required}"
: "${DB_HOST:?[backend] ERROR: DB_HOST is required}"
: "${DB_PORT:?[backend] ERROR: DB_PORT is required}"

# ========= Logging =========
LOG_FILE="/var/log/laravel-entrypoint.log"
mkdir -p /var/log
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========== [backend] starting entrypoint =========="
echo "Time: $(date)"
echo "[backend] PHP: $(php -v | head -n1)"

echo "[backend] waiting for DB ${DB_HOST}:${DB_PORT} ..."
TRY=0
until MYSQL_PWD="${DB_PASSWORD:-root}" mysqladmin ping \
  --protocol=tcp -h"${DB_HOST}" -P"${DB_PORT}" -u"${DB_USERNAME:-root}" --silent >/dev/null 2>&1
do
  TRY=$((TRY+1))
  [ "$TRY" -gt 60 ] && { echo "[backend] ERROR: DB not ready after 120s"; exit 1; }
  sleep 2
done
echo "[backend] DB is up"

# กันพลาดกรณี vendor หาย
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[backend] vendor incomplete -> composer install"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
fi
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# APP_KEY
if [ -n "${APP_KEY:-}" ]; then
  echo "[backend] APP_KEY provided via env; skip key:generate"
elif [ -f .env ] && ! grep -q '^APP_KEY=' .env; then
  echo "[backend] Generating APP_KEY into .env ..."
  php artisan key:generate --force
else
  echo "[backend] APP_KEY already set"
fi

chmod -R ug+rwX storage bootstrap/cache || true

# DEBUG: DB ที่ใช้จริง
php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$k=\$app->make(Illuminate\Contracts\Console\Kernel::class); \$k->bootstrap(); echo \"[backend] Using DB: \".config('database.connections.mysql.host').':'.config('database.connections.mysql.database').PHP_EOL;"

# ===== Migrate =====
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[backend] running migrations ..."
  php artisan migrate --force --no-interaction
fi

# ===== Seed (ถาวร: ใช้ DatabaseSeeder เสมอ) =====
if [ "${RUN_SEEDER:-1}" = "1" ]; then
  # ยืนยันว่ามีคลาส DatabaseSeeder จริง (ถ้าไม่มีก็ฟ้องให้แก้ไฟล์/auto-load)
  if ! php -r 'require "vendor/autoload.php"; exit(class_exists("Database\\\\Seeders\\\\DatabaseSeeder")?0:1);'; then
    echo "[backend] FATAL: Database\\Seeders\\DatabaseSeeder not found."
    echo "[backend] HINT: ตรวจว่าไฟล์อยู่ที่ database/seeders/DatabaseSeeder.php (ตัวพิมพ์ใหญ่-เล็กสำคัญบน Linux)"
    echo "[backend] HINT: เช็ค composer.json autoload PSR-4: \"Database\\\\Seeders\\\\\": \"database/seeders/\" แล้วรัน composer dump-autoload"
    ls -la database/seeders || true
    exit 1
  fi

  echo "[backend] seeding (default DatabaseSeeder) ..."
  php artisan db:seed --force --no-interaction
fi

# ===== Clear & Cache หลัง migrate/seed =====
php artisan config:clear || true
php artisan cache:clear  || true
php artisan route:clear  || true
php artisan view:clear   || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "========== [backend] starting Laravel server =========="
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
