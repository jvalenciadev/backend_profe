# Multi-stage production Dockerfile for NestJS
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies for Prisma
RUN apk add --no-cache openssl libc6-compat

# Copy root configurations
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install all dependencies (including dev for building)
RUN npm install

# Copy source and libs
COPY apps/ ./apps/
COPY libs/ ./libs/

# Copy Firebase admin SDK if present
COPY *.json ./

# Generate Prisma client
RUN npx prisma generate --schema=./libs/database/prisma/schema.prisma

# Build each app explicitly using nest CLI
RUN npx nest build backend
RUN npx nest build views
RUN npx nest build lms

# Production image
FROM node:24-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production

# Copy built assets and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/libs/database/prisma ./libs/database/prisma

# Copy Firebase admin SDK JSON if it was generated
COPY --from=builder /app/*.json ./

# Expose production ports (Main backend:3000, LMS:3008, Views:3005)
EXPOSE 3000
EXPOSE 3008
EXPOSE 3005

# Start the apps concurrently without running migrations automatically
CMD ["sh", "-c", "./node_modules/.bin/concurrently \"node dist/apps/backend/main.js\" \"node dist/apps/lms/apps/lms/src/main.js\" \"node dist/apps/views/apps/views/src/main.js\""]
