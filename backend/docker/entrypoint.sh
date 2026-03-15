#!/bin/sh

# Set the APP_KEY if not set
if [ -z "$APP_KEY" ]; then
    echo "APP_KEY is not set, generating one..."
    php artisan key:generate --show --no-interaction
fi

# Run migrations
echo "Running migrations..."
php artisan migrate --force --no-interaction

# If arguments are passed, run them instead of starting Nginx/PHP-FPM
if [ $# -gt 0 ]; then
    echo "Running command: $@"
    exec "$@"
fi

# Replace the port in Nginx config with Render's PORT if provided
PORT=${PORT:-80}
sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/http.d/default.conf

# Start php-fpm in the background and ensure it logs to stdout
echo "Starting PHP-FPM..."
php-fpm -D -O

# Start nginx in the foreground
echo "Starting Nginx on port $PORT..."
nginx -g "daemon off;"
