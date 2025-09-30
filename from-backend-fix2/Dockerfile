# ===== Backend (Laravel) on PHP 8.3 CLI (Alpine) =====
FROM php:8.3-cli-alpine

WORKDIR /app

# ----- System & PHP extensions -----
RUN apk add --no-cache \
      tzdata git curl unzip ca-certificates \
      $PHPIZE_DEPS build-base pkgconf \
      icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      bzip2-dev xz-dev zlib-dev zstd-dev \
      mariadb-client \
 && docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring zip exif gd intl bcmath \
 && rm -rf /var/cache/apk/*

# ----- Composer -----
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
ARG PACKAGIST=https://packagist.org
ARG GITHUB_TOKEN=
RUN composer config -g repos.packagist composer "${PACKAGIST}" \
 && if [ -n "${GITHUB_TOKEN}" ]; then composer config -g github-oauth.github.com "${GITHUB_TOKEN}"; fi

ENV TZ=Asia/Bangkok \
    COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1 \
    COMPOSER_PROCESS_TIMEOUT=1800 \
    APP_PORT=4002

# ----- Install vendors (no-scripts) -----
COPY composer.json composer.lock* ./
RUN composer install --no-interaction --prefer-dist --no-dev -o --no-scripts

# ----- Copy app source -----
COPY . .

# ----- Autoload optimize (ไม่เรียก artisan ระหว่าง build) -----
RUN composer dump-autoload -o

# ----- Prepare runtime dirs & permissions -----
# สร้าง user www-data (Alpine) และกำหนดสิทธิ์ให้เขียนได้
RUN addgroup -g 82 -S www-data || true \
 && adduser -u 82 -D -S -G www-data www-data || true \
 && mkdir -p \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/testing \
    storage/framework/views \
    bootstrap/cache \
 && chown -R www-data:www-data storage bootstrap/cache \
 && chmod -R ug+rwX storage bootstrap/cache

USER www-data

EXPOSE 4002

# ----- Run web server (ไม่มี migration/seed อัตโนมัติ) -----
CMD ["sh", "-lc", "php artisan serve --host=0.0.0.0 --port=${APP_PORT}"]
