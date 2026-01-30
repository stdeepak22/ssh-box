# Stage 1: Build
FROM node:18-alpine AS build

WORKDIR /app

# Copy root package.json and workspace definitions
COPY package*.json ./

# Copy packages
COPY packages/common ./packages/common
COPY packages/web ./packages/web

# Install all dependencies (reproducible build)
RUN npm ci

# Build common first (web depends on it)
WORKDIR /app/packages/common
RUN npm run build

# Build web app
WORKDIR /app/packages/web
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy build artifacts to nginx public directory
COPY --from=build /app/packages/web/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing if needed
RUN echo "server { \
    listen 80; \
    location / { \
    root /usr/share/nginx/html; \
    index index.html; \
    try_files \$uri \$uri/ /index.html; \
    } \
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
