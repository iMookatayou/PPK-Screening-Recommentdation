# PHP CLI + extensions + composer + mysql-client (รอ DB ได้)
FROM php:8.3-cli-alpine

WORKDIR /app

RUN apk add --no-cache \
      bash git curl icu-dev oniguruma-dev libzip-dev \
      libpng-dev freetype-dev libjpeg-turbo-dev \
      mysql-client \
  && docker-php-ext-configure gd --with-freetype --with-jpeg \
  && docker-php-ext-install pdo pdo_mysql mbstring zip exif gd intl

# Composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# คัดลอกไฟล์ก่อน เพื่อ cache composer install ได้ (จะถูกแทนด้วย volume ตอนรัน)
COPY composer.json composer.lock* ./
RUN composer install --no-interaction || true

COPY . .

# entrypoint จะเช็ค vendor/.env ให้อัตโนมัติ
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 9001
CMD ["/usr/local/bin/entrypoint.sh"]
