# Base image for dependency installation
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm install

# Development stage
FROM base AS dev
WORKDIR /app
COPY . .
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
EXPOSE 3000
CMD ["npm", "run", "dev"]

# Production build stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Production runner stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["npm", "run", "start"]
