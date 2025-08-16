#!/usr/bin/env bash
set -e

echo "[backend] waiting for DB ..."
# รอ DB ด้วย mysql-client
until mysqladmin ping -h"${DB_HOST:-db}" -u"${DB_USERNAME:-root}" -p"${DB_PASSWORD:-root}" --silent; do
  sleep 2
done
echo "[backend] DB is up"

# เตรียมโปรเจกต์
if [ ! -f .env ]; then
  cp .env.example .env || true
fi

# ติดตั้ง dependency (ถ้า vendor หาย)
if [ ! -d vendor ]; then
  composer install
fi

php artisan key:generate || true
chmod -R 777 storage bootstrap/cache

# รัน migration + seeder
php artisan migrate --force
# ถ้าระบุ SEED_CLASS จะ seed class นั้นเพิ่ม, ไม่งั้นรัน DatabaseSeeder ปกติ
if [ -n "$SEED_CLASS" ]; then
  php artisan db:seed --force --class="$SEED_CLASS"
else
  php artisan db:seed --force
fi

# รัน dev server (HTTP) ที่พอร์ต 9001
exec php artisan serve --host=0.0.0.0 --port=9001
