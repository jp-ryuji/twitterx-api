# Technology Stack

## Core Technologies

- **Framework**: NestJS (Node.js framework with TypeScript)
- **Language**: TypeScript with strict configuration
- **Runtime**: Node.js v22.x (specified in .nvmrc and package.json engines)
- **Package Manager**: pnpm (strictly enforced - do not use npm or yarn)
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: Redis
- **API Documentation**: Swagger/OpenAPI

## Development Tools

- **Linting**: ESLint with TypeScript support
- **Formatting**: Prettier with single quotes and trailing commas
- **Testing**: Jest for unit, integration, and E2E tests
- **Git Hooks**: Husky with lint-staged for pre-commit checks
- **Containerization**: Docker and Docker Compose

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development server with hot reload
pnpm run start:dev

# Start in debug mode
pnpm run start:debug

# Build for production
pnpm build

# Start production server
pnpm run start:prod
```

### Database (Prisma)
```bash
# Generate Prisma client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Open Prisma Studio
pnpm prisma:studio
```

### Testing
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run E2E tests (with Docker test environment)
pnpm run test:e2e

# Generate coverage report
pnpm run test:cov
```

### Code Quality
```bash
# Lint and fix code
pnpm run lint

# Format code
pnpm run format
```

### Docker
```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (clean restart)
docker compose down -v
```

## Configuration

- Environment variables defined in `.env` (see `.env.example`)
- TypeScript config uses modern ES2023 target with decorators enabled
- Prisma schema defines database models and generates type-safe client
- ESLint enforces import ordering and TypeScript best practices
