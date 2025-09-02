# 1. Development stage
FROM node:22-alpine AS development
WORKDIR /app
RUN npm install -g pnpm
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install
# Copy prisma files needed for client generation
COPY prisma/schema.prisma ./prisma/
RUN pnpm prisma:generate
CMD ["pnpm", "run", "start:dev"]

# 2. Build stage (compiles TypeScript to JavaScript)
FROM development AS build
COPY . .
RUN pnpm run build

# 3. Production stage (installs only production dependencies)
FROM node:22-alpine AS production
WORKDIR /app
# Install pnpm first
RUN npm install -g pnpm
# Set PNPM_HOME for global installations and add to PATH
ENV PNPM_HOME=/app/.pnpm
ENV PATH=$PNPM_HOME:$PATH
# Install only production dependencies
COPY package.json ./
COPY pnpm-lock.yaml ./
RUN pnpm install --prod --ignore-scripts
# Install prisma CLI separately for schema generation
RUN pnpm add -g prisma
COPY prisma/schema.prisma ./prisma/
RUN pnpm prisma:generate
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
