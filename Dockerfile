# Multi-stage production Dockerfile for NestJS
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./

# Install all dependencies (including dev for building)
RUN npm install

# Copy source and libs
COPY apps/ ./apps/
COPY libs/ ./libs/

# Build the main monolithic backend
RUN npx prisma generate --schema=./libs/database/prisma/schema.prisma
RUN npm run build backend

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy built assets and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

# Expose production port
EXPOSE 3000

# Run migrations and start the app
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./libs/database/prisma/schema.prisma && find dist -name main.js | xargs node"]
