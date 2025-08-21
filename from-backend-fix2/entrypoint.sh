# #!/bin/sh
# set -Eeuo pipefail

# : "${APP_PORT:?Missing APP_PORT (.env BACKEND_PORT)}"
# : "${RUN_MIGRATIONS:=1}"
# : "${RUN_SEEDER:=1}"

# echo "========== [backend] entrypoint =========="
# echo "[backend] PHP: $(php -v | head -n1)"
# echo "[backend] APP_PORT=${APP_PORT}"

# # 1) vendor
# if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
#   echo "[backend] vendor missing -> composer install"
#   COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
# fi
# COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# # 2) APP_KEY (เฉพาะกรณี .env ไม่มี)
# if [ -z "${APP_KEY:-}" ] && [ -f .env ] && ! grep -qE '^APP_KEY=.+$' .env; then
#   echo "[backend] generating APP_KEY"
#   CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan key:generate --force --ansi || true
# fi

# # 3) permission เบื้องต้น
# chmod -R ug+rwX storage bootstrap/cache || true

# # 4) clear cache แบบปลอดภัย
# CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan config:clear || true
# CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan cache:clear  || true
# CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan route:clear  || true
# CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan view:clear   || true

# # 5) migrate / seed ตามสวิตช์ (ถ้าต้องการรอ DB ค่อยเติมบล็อกรอที่นี่)
# if [ "${RUN_MIGRATIONS}" = "1" ]; then
#   echo "[backend] ===== RUN MIGRATIONS ====="
#   CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan migrate --force --no-interaction || true
# fi
# if [ "${RUN_SEEDER}" = "1" ]; then
#   echo "[backend] ===== RUN SEEDERS ====="
#   CACHE_STORE=array CACHE_DRIVER=array QUEUE_CONNECTION=sync php artisan db:seed --force --no-interaction || true
# fi

# # 6) link & cache
# php artisan storage:link || true
# php artisan cache:clear  || true
# php artisan config:cache || true
# php artisan route:cache  || true
# php artisan view:cache   || true
# php artisan optimize     || true

# echo "========== [backend] starting Laravel server on 0.0.0.0:${APP_PORT} =========="
# exec php artisan serve --host=0.0.0.0 --port="${APP_PORT}"
