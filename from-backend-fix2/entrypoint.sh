#!/bin/sh
set -euo pipefail

# ========= Config =========
LOG_FILE="/var/log/laravel-entrypoint.log"
DB_WAIT_TIMEOUT="${DB_WAIT_TIMEOUT:-120}"   # seconds
DB_WAIT_INTERVAL="${DB_WAIT_INTERVAL:-2}"   # seconds

mkdir -p /var/log
: > "$LOG_FILE"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "========== [backend] starting entrypoint =========="
echo "Time: $(date)"
echo "[backend] PHP: $(php -v | head -n1)"

# ========= Require port for app serve =========
: "${APP_PORT:?[backend] ERROR: APP_PORT is required}"

# ========= Resolve database settings (supports DATABASE_URL) =========
DB_SCHEME=""; DB_HOST_RES=""; DB_PORT_RES=""; DB_USER_RES=""; DB_PASS_RES=""; DB_NAME_RES=""

if [ -n "${DATABASE_URL:-}" ]; then
  echo "[backend] Parsing DATABASE_URL ..."
  php -r '
    $u=getenv("DATABASE_URL"); if(!$u){exit(1);}
    $p=parse_url($u); $db = isset($p["path"])? ltrim($p["path"],"/") : "";
    $out=["scheme"=>$p["scheme"]??"","host"=>$p["host"]??"","port"=>$p["port"]??"","user"=>$p["user"]??"","pass"=>$p["pass"]??"","name"=>$db];
    echo $out["scheme"]."|".$out["host"]."|".$out["port"]."|".$out["user"]."|".$out["pass"]."|".$out["name"];
  ' | IFS='|' read -r DB_SCHEME DB_HOST_RES DB_PORT_RES DB_USER_RES DB_PASS_RES DB_NAME_RES
else
  echo "[backend] DATABASE_URL not set, fallback to DB_* envs"
  DB_SCHEME="${DB_SCHEME:-mysql}"
  DB_HOST_RES="${DB_HOST:-}"
  DB_PORT_RES="${DB_PORT:-}"
  DB_USER_RES="${DB_USERNAME:-root}"
  DB_PASS_RES="${DB_PASSWORD:-}"
  DB_NAME_RES="${DB_DATABASE:-}"
fi
DB_SCHEME="${DB_SCHEME:-mysql}"

echo "[backend] DB resolved: scheme=${DB_SCHEME} host=${DB_HOST_RES:-<none>} port=${DB_PORT_RES:-<none>} db=${DB_NAME_RES:-<none>} user=${DB_USER_RES:-<none>}"

# ========= Wait for DB if needed =========
if [ "$DB_SCHEME" = "sqlite" ] || [ "$DB_SCHEME" = "sqlite3" ]; then
  echo "[backend] SQLite detected -> skip DB wait"
else
  if [ -z "${DB_HOST_RES}" ] || [ -z "${DB_PORT_RES}" ]; then
    echo "[backend] ERROR: DB host/port not resolved. Set DATABASE_URL or DB_HOST/DB_PORT."
    exit 1
  fi
  if ! command -v mysqladmin >/dev/null 2>&1; then
    echo "[backend] Installing mysql-client for wait ..."
    (command -v apk >/dev/null 2>&1 && apk add --no-cache mysql-client) \
    || (command -v apt-get >/dev/null 2>&1 && apt-get update && apt-get install -y default-mysql-client && rm -rf /var/lib/apt/lists/*) \
    || (command -v microdnf >/dev/null 2>&1 && microdnf install -y mysql && microdnf clean all) \
    || echo "[backend] WARN: no package manager found; ensure mysqladmin exists."
  fi

  echo "[backend] waiting for DB ${DB_HOST_RES}:${DB_PORT_RES} ..."
  ELAPSED=0
  while ! MYSQL_PWD="${DB_PASS_RES}" mysqladmin ping --protocol=tcp \
          -h"${DB_HOST_RES}" -P"${DB_PORT_RES}" -u"${DB_USER_RES}" --silent >/dev/null 2>&1
  do
    ELAPSED=$((ELAPSED+DB_WAIT_INTERVAL))
    [ "$ELAPSED" -ge "$DB_WAIT_TIMEOUT" ] && { echo "[backend] ERROR: DB not ready after ${DB_WAIT_TIMEOUT}s"; exit 1; }
    sleep "${DB_WAIT_INTERVAL}"
  done
  echo "[backend] DB is up"
fi

# ========= Safe env (สำคัญ: ประกาศก่อน Composer) =========
SAFE_ENV="CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync"

# ========= Ensure vendor (Composer ใต้ SAFE_ENV) =========
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[backend] vendor incomplete -> composer install (SAFE_ENV)"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 \
  sh -lc "$SAFE_ENV composer install --no-interaction --prefer-dist"
fi
echo "[backend] composer dump-autoload -o (SAFE_ENV)"
COMPOSER_ALLOW_SUPERUSER=1 \
sh -lc "$SAFE_ENV composer dump-autoload -o" || true

# ========= APP_KEY =========
if [ -n "${APP_KEY:-}" ]; then
  echo "[backend] APP_KEY provided via env; skip key:generate"
elif [ -f .env ] && ! grep -q '^APP_KEY=' .env; then
  echo "[backend] Generating APP_KEY into .env ..."
  sh -lc "$SAFE_ENV php artisan key:generate --force --ansi"   # ปลอดภัยระหว่าง pre-DB
else
  echo "[backend] APP_KEY already set"
fi

# ========= Permissions =========
chmod -R ug+rwX storage bootstrap/cache || true

# ========= Pre-DB clears (SAFE_ENV) =========
sh -lc "$SAFE_ENV php artisan config:clear" || true
sh -lc "$SAFE_ENV php artisan route:clear"  || true
sh -lc "$SAFE_ENV php artisan view:clear"   || true
# (จงใจไม่เรียก cache:clear ตรงนี้)

# ========= Migrate / Seed (SAFE_ENV) =========
MIGRATE_STRATEGY="${MIGRATE_STRATEGY:-safe}"
echo "[backend] migrate strategy = ${MIGRATE_STRATEGY} (APP_ENV=${APP_ENV:-})"

case "$MIGRATE_STRATEGY" in
  fresh)
    if [ "${APP_ENV:-}" = "local" ]; then
      echo "[backend] migrate:fresh --seed --force (SAFE_ENV)"
      sh -lc "$SAFE_ENV php artisan migrate:fresh --seed --force"
    else
      echo "[backend][WARN] fresh blocked (non-local) -> safe"
      sh -lc "$SAFE_ENV php artisan migrate --force --no-interaction"
      [ "${RUN_SEEDER:-1}" = "1" ] && sh -lc "$SAFE_ENV php artisan db:seed --force --no-interaction" || true
    fi
    ;;
  none)
    echo "[backend] skip migrations/seeding"
    ;;
  safe|*)
    if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
      echo "[backend] migrate --force --no-interaction (SAFE_ENV)"
      sh -lc "$SAFE_ENV php artisan migrate --force --no-interaction"
    fi
    if [ "${RUN_SEEDER:-1}" = "1" ]; then
      if php -r 'require "vendor/autoload.php"; exit(class_exists("Database\\Seeders\\DatabaseSeeder")?0:1);'; then
        echo "[backend] db:seed --force --no-interaction (SAFE_ENV)"
        sh -lc "$SAFE_ENV php artisan db:seed --force --no-interaction"
      else
        echo "[backend] WARN: Database\\Seeders\\DatabaseSeeder not found -> skip seeding"
      fi
    fi
    ;;
esac

# ========= Post-DB: เคลียร์/แคชด้วย env จริง =========
php artisan cache:clear  || true
php artisan config:cache || true
php artisan route:cache  || true
php artisan view:cache   || true

echo "========== [backend] starting Laravel server =========="
exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
