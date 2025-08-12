# Project Structure

## Root Directory Organization

```
├── src/                    # Source code
├── test/                   # E2E tests
├── prisma/                 # Database schema and migrations
├── dist/                   # Compiled output (generated)
├── node_modules/           # Dependencies (generated)
├── .kiro/                  # Kiro AI assistant configuration
├── .husky/                 # Git hooks
├── .vscode/                # VS Code settings
└── docker-compose.yml      # Container orchestration
```

## Source Code Structure (`src/`)

```
src/
├── main.ts                 # Application entry point
├── app.module.ts           # Root module
├── app.controller.ts       # Root controller
├── app.service.ts          # Root service
│
├── health/                 # Health check module
│   ├── health.module.ts
│   ├── health.controller.ts
│   ├── health.service.ts
│   └── *.spec.ts          # Unit tests
│
└── prisma/                 # Database service module
    ├── prisma.module.ts
    └── prisma.service.ts
```

## Architecture Patterns

### Module Organization
- Each feature is organized as a NestJS module
- Modules are self-contained with their own controllers, services, and tests
- Shared functionality goes in dedicated modules (e.g., `prisma/`)

### File Naming Conventions
- **Modules**: `*.module.ts`
- **Controllers**: `*.controller.ts` 
- **Services**: `*.service.ts`
- **Unit Tests**: `*.spec.ts`
- **E2E Tests**: `*.e2e-spec.ts`

### API Versioning
- All API endpoints use `/v1/` prefix for versioning
- Controllers specify version in `@Controller('v1/resource')` decorator

### Database Integration
- `PrismaService` extends `PrismaClient` for database operations
- All modules import `PrismaModule` to access database
- Database models defined in `prisma/schema.prisma`

## Testing Structure

```
test/
├── app.e2e-spec.ts         # Main E2E test suite
├── jest-e2e.json           # E2E Jest configuration
├── run-e2e-tests.sh        # E2E test runner script
└── test-docker-environment.ts  # Test environment setup
```

### Testing Philosophy
- Unit tests alongside source files (`*.spec.ts`)
- E2E tests in separate `test/` directory
- Mock `PrismaClient` for unit tests
- Use separate test database for E2E tests

## Configuration Files

- **TypeScript**: `tsconfig.json`, `tsconfig.build.json`
- **NestJS**: `nest-cli.json`
- **Database**: `prisma/schema.prisma`
- **Linting**: `eslint.config.mjs`, `.prettierrc`
- **Git**: `.gitignore`, `.husky/` hooks
- **Docker**: `Dockerfile`, `docker-compose.yml`
- **Environment**: `.env.example`, `.env.test.local.example`

## Import Order Convention

ESLint enforces specific import grouping:
1. Node.js built-ins
2. External packages (NestJS first)
3. Internal modules
4. Parent/sibling imports
5. Type imports

Always use absolute imports from project root when possible.
