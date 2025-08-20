# 1. Development stage
FROM node:22-alpine AS development
WORKDIR /usr/src/app
RUN npm install -g pnpm
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm prisma:generate
CMD ["pnpm", "run", "start:dev"]

# 2. Build stage for creating a production build
FROM development AS build
RUN pnpm run build

# 3. Production stage
FROM node:22-alpine AS production
WORKDIR /usr/src/app
# Install only production dependencies
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --prod
COPY --from=build /usr/src/app/dist ./dist
# Copy prisma schema for regeneration
COPY --from=build /usr/src/app/prisma ./prisma
# Regenerate Prisma client for the production environment
RUN pnpm prisma:generate
EXPOSE 3000
CMD ["node", "dist/main"]
