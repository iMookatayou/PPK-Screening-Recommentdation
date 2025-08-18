# PHP CLI + extensions + composer + mysql-client
FROM php:8.3-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
      bash git curl icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      mysql-client \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install pdo pdo_mysql mbstring zip exif gd intl

# Composer
RUN curl -sS https://getcomposer.org/installer | php -- \
    --install-dir=/usr/local/bin --filename=composer

# ===== Composer: รอบแรก (ไม่มี artisan) → ไม่รันสคริปต์ =====
COPY composer.json composer.lock* ./
RUN COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 \
    composer install --no-interaction --prefer-dist --no-scripts

# ค่อยคัดลอกโปรเจกต์ทั้งหมด (มี artisan แล้ว)
COPY . .

# ===== Composer: รอบสอง (มี artisan แล้ว) → รันสคริปต์ + dump autoload =====
RUN COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 \
    composer install --no-interaction --prefer-dist \
 && COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o

# ===== Entrypoint =====
RUN <<'SH' /bin/sh -eux
cat >/usr/local/bin/entrypoint.sh <<'EOF'
#!/bin/sh
set -euo pipefail

echo "[backend] waiting for DB ${DB_HOST:-db}:${DB_PORT:-3306} ..."
TRY=0
until MYSQL_PWD="${DB_PASSWORD:-root}" mysqladmin ping \
  --protocol=tcp -h"${DB_HOST:-db}" -P"${DB_PORT:-3306}" -u"${DB_USERNAME:-root}" --silent >/dev/null 2>&1
do
  TRY=$((TRY+1)); [ "$TRY" -gt 60 ] && { echo "[backend] DB not ready after 120s"; exit 1; }
  sleep 2
done
echo "[backend] DB is up"

# กันพลาดกรณีถูก mount โค้ดทับ vendor
if [ ! -f vendor/laravel/framework/src/Illuminate/Foundation/Application.php ]; then
  echo "[backend] vendor incomplete -> composer install"
  COMPOSER_ALLOW_SUPERUSER=1 COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --prefer-dist
fi
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true

# เคลียร์/แคช
php artisan config:clear || true
php artisan cache:clear  || true
php artisan route:clear  || true
php artisan view:clear   || true
php artisan config:cache && php artisan route:cache && php artisan view:cache

chmod -R ug+rwX storage bootstrap/cache || true

# โชว์ DB ที่จะใช้ (ช่วยดีบัก)
php -r "require 'vendor/autoload.php'; \$app=require 'bootstrap/app.php'; \$k=\$app->make(Illuminate\Contracts\Console\Kernel::class); \$k->bootstrap(); echo \"[backend] Using DB: \".config('database.connections.mysql.host').':'.config('database.connections.mysql.database').PHP_EOL;"

# migrate/seed (fail-fast)
[ "${RUN_MIGRATIONS:-1}" = "1" ] && php artisan migrate --force --no-interaction
if [ -n "${SEED_CLASS:-}" ]; then
  php artisan db:seed --force --no-interaction --class="${SEED_CLASS}"
elif [ "${RUN_SEEDER:-0}" = "1" ]; then
  php artisan db:seed --force --no-interaction
fi

exec php artisan serve --host=0.0.0.0 --port="${APP_PORT:-9001}"
EOF
chmod 0755 /usr/local/bin/entrypoint.sh
SH

EXPOSE 9001
CMD ["/usr/local/bin/entrypoint.sh"]
