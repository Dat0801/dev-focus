#!/bin/sh

# Set the APP_KEY if not set
if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set, generating one..."
    php artisan key:generate --show --no-interaction
fi

# Replace the port in Nginx config with Render's PORT if provided
PORT=${PORT:-80}
sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/http.d/default.conf

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Start php-fpm in the background
php-fpm -D

# Start nginx in the foreground
echo "Starting Nginx on port $PORT..."
nginx -g "daemon off;"
