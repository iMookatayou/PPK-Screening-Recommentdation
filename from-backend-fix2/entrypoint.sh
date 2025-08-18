#!/bin/sh
set -euo pipefail

# เตรียม log file
LOG_FILE="/var/log/laravel-entrypoint.log"
mkdir -p /var/log
touch "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========== [backend] starting entrypoint =========="
echo "Time: $(date)"
echo "[backend] PHP: $(php -v | head -n1)"

echo "[backend] waiting for DB ${DB_HOST:-db}:${DB_PORT:-3306} ..."
TRY=0
until MYSQL_PWD="${DB_PASSWORD:-root}" mysqladmin ping \
  --protocol=tcp -h"${DB_HOST:-db}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" --silent >/dev/null 2>&1
do
  TRY=$((TRY+1))
  if [ "$TRY" -gt 60 ]; then
    echo "[backend] ERROR: DB not ready after 120s"
    exit 1
  fi
  sleep 2
done
echo "[backend] DB is up"

# ไม่ copy .env โดยอัตโนมัติ เว้นแต่สั่งไว้ชัดๆ
if [ "${COPY_ENV_IF_MISSING:-0}" = "1" ] && [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "[backend] copied .env.example to .env"
fi

# ตรวจ vendor/laravel framework; ถ้าไม่ครบ ให้ติดตั้ง (รวม dev เพื่อ autoload seeders)
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[backend] vendor incomplete -> composer install (with dev)"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
fi
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# APP_KEY: ใช้ที่ให้มาทาง env/.env; gen เฉพาะกรณียังไม่มีจริงๆ
if [ -n "${APP_KEY:-}" ]; then
  echo "[backend] APP_KEY provided via env; skip key:generate"
elif [ -f .env ] && ! grep -q '^APP_KEY=' .env; then
  echo "[backend] Generating APP_KEY into .env ..."
  php artisan key:generate --force
else
  echo "[backend] APP_KEY already set"
fi

# Clear & cache
php artisan config:clear || true
php artisan cache:clear  || true
php artisan route:clear  || true
php artisan view:clear   || true

php artisan config:cache
php artisan route:cache
php artisan view:cache

# Permission
chown -R 0:0 storage bootstrap/cache || true
chmod -R ug+rwX storage bootstrap/cache || true

# DEBUG: แสดง DB ที่ Laravel จะใช้จริง
php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$kernel=\$app->make(Illuminate\Contracts\Console\Kernel::class); \$kernel->bootstrap(); echo \"[backend] Using DB: \".config('database.connections.mysql.host').':'.config('database.connections.mysql.database').PHP_EOL;"

# ===== Migrate & Seed (fail-fast) =====
if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "[backend] running migrations ..."
  php artisan migrate --force --no-interaction
fi

if [ -n "${SEED_CLASS:-}" ]; then
  echo "[backend] seeding class: ${SEED_CLASS}"
  php artisan db:seed --force --no-interaction --class="${SEED_CLASS}"
elif [ "${RUN_SEEDER:-0}" = "1" ]; then
  echo "[backend] seeding (DatabaseSeeder)"
  php artisan db:seed --force --no-interaction
fi

echo "========== [backend] starting Laravel server =========="
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT:-9001}"
