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

# Build common first
WORKDIR /app/packages/common
RUN npm run build

# Build web app
WORKDIR /app/packages/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Run
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=build /app/packages/web/.next/standalone ./
COPY --from=build /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=build /app/packages/web/public ./packages/web/public

USER nextjs

EXPOSE 3000

# The standalone output includes a server.js file in the package directory
CMD ["node", "packages/web/server.js"]
