# Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Build the application
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 express

# Copy necessary files
COPY --from=deps --chown=express:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=express:nodejs /app/dist ./dist
COPY --from=builder --chown=express:nodejs /app/package.json ./

USER express

EXPOSE 3000

CMD ["node", "dist/index.js"]
