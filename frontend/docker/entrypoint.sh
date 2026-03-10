#!/bin/sh

# Replace the port in Nginx config with Render's PORT if provided
PORT=${PORT:-80}
sed -i "s/listen 80;/listen $PORT;/g" /etc/nginx/conf.d/default.conf

echo "Starting Nginx on port $PORT..."
nginx -g "daemon off;"
