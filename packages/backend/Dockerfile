FROM node:18-alpine

WORKDIR /app

# Copy root package.json and lockfile
COPY package*.json ./

# Copy packages
COPY packages/common/types ./packages/common/types
COPY packages/backend ./packages/backend

# Install dependencies (reproducible build)
RUN npm ci

# Build common
WORKDIR /app/packages/common/types
RUN npm run build

# Build backend
WORKDIR /app/packages/backend
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
