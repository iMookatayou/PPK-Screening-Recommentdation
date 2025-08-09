#!/bin/sh
set -e

# Wait for the database to be ready
until php artisan migrate:status > /dev/null 2>&1; do
  echo "Waiting for database connection..."
  sleep 3
done

# Run migrations
php artisan migrate --force

# Start PHP-FPM
exec php-fpm
