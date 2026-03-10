# Stage 1: Build the app
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build -- --configuration production

# Stage 2: Serve the app with Nginx
FROM nginx:stable-alpine

# Copy the build output from the build stage
COPY --from=build /app/www /usr/share/nginx/html

# Copy the Nginx configuration
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose port 80
EXPOSE 80

# Entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
