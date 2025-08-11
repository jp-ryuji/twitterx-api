# TwitterX-API

This document is the central project handbook for the **TwitterX-API**, a comprehensive clone of the core functionalities of X (formerly Twitter). It serves as a guide for development, architecture, and deployment, demonstrating best practices in modern backend engineering.

## 🚀 1. Project Overview

**TwitterX-API** is a high-quality, scalable backend service built to replicate the core features of X. Developed as a portfolio piece, it showcases proficiency in **NestJS**, **TypeScript**, and modern database management with **Prisma**.

* **Core Features**:
  * User Authentication (JWT-based) & Profile Management
  * Creating, Reading, and Deleting Tweets
  * Following & Unfollowing Users
  * Personalized Timeline Feed Generation
* **Tech Stack**:
  * Framework: **NestJS**
  * Language: **TypeScript**
  * Node.js: **v22.x**
  * Package Manager: **pnpm**
  * Database: **PostgreSQL**
  * ORM: **Prisma**
  * API Documentation: **Swagger**
  * Testing: **Jest**

## 🛠️ 2. Getting Started

Follow these steps to set up and run the project locally.

### Prerequisites

* Node.js (v22.x or later)
* **pnpm** (`npm install -g pnpm`)
* Docker and Docker Compose (for the database)

### Installation & Setup

1. **Clone the repository:**

    ```bash
    git clone https://github.com/jp-ryuji/twitterx-api.git
    cd twitterx-api
    ```

2. **Install dependencies using pnpm:**

    ```bash
    pnpm install
    ```

3. **Set up environment variables:**
    Copy the example environment file. This file contains all the necessary configuration keys.

    ```bash
    cp .env.example .env
    ```

    Update the `.env` file with your database credentials and JWT secret.

4. **Start the database container:**
    This command uses Docker Compose to start a PostgreSQL instance.

    ```bash
    docker-compose up -d
    ```

5. **Run database migrations with Prisma:**
    This command will create the database if it doesn't exist, apply all pending migrations, and generate the Prisma Client.

    ```bash
    pnpm prisma migrate dev
    ```

6. **Run the application in development mode:**

    ```bash
    pnpm run start:dev
    ```

    The API will now be running on `http://localhost:3000`.

## 🏛️ 3. Architecture & Prisma

The API is built on a modular architecture, with **Prisma** serving as the modern data access layer.

### Directory Structure

```plaintext
src/
├── app.module.ts            # Root application module
├── main.ts                  # Application entry point
│
├── auth/                    # Authentication (JWT)
├── users/                   # User management
├── tweets/                  # Tweet creation & retrieval
├── follows/                 # Follow/unfollow logic
│
├── core/                    # Shared modules, services, guards
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   └── prisma/
│       ├── prisma.module.ts # Provides the PrismaService
│       └── prisma.service.ts  # Injectable service for DB access
│
└── config/                  # Environment configuration
...
prisma/
└── schema.prisma            # The single source of truth for your DB schema
└── migrations/              # Auto-generated SQL migration files
```

### Core Concepts & Prisma Integration

* **Modules (`@Module`)**: Features like `UsersModule` and `TweetsModule` are self-contained. They import the `PrismaModule` to get access to the database.
* **Controllers (`@Controller`)**: Handle API requests. They are lean and delegate all business logic to services.
* **Services (`@Injectable`)**: Contain the core logic. They are injected with the `PrismaService` to perform database operations (CRUD).

    ```typescript
    // example in a service
    import { Injectable } from '@nestjs/common';
    import { PrismaService } from '../core/prisma/prisma.service';

    @Injectable()
    export class TweetsService {
      constructor(private prisma: PrismaService) {}

      async createTweet(userId: number, content: string) {
        return this.prisma.tweet.create({
          data: {
            content,
            authorId: userId,
          },
        });
      }
    }
    ```

* **API Versioning**: The API uses URI-based versioning (e.g., `/v1/...`) managed by NestJS. This is configured in `main.ts` and specified in each controller to ensure backward compatibility as the API evolves.
* **Prisma Schema (`schema.prisma`)**: This is the heart of our data model. It defines all tables, columns, types, and relations in a clear, readable syntax. It is the single source of truth, and the **Prisma Client** is automatically generated from it.

## 📝 4. API & Documentation

The API is documented using **Swagger** (OpenAPI). While the application is running, the interactive documentation is available at:

`http://localhost:3000/api`

This UI allows for easy exploration and testing of all endpoints, such as:

* `POST /v1/auth/login`
* `GET /v1/users/:username`
* `POST /v1/tweets`
* `GET /v1/timeline`
* `POST /v1/users/:userId/follow`

## ✅ 5. Testing

The project uses **Jest** for unit, integration, and E2E testing. The testing philosophy is to mock the `PrismaClient` at the unit level and use a separate test database for E2E tests.

### Running Tests

```bash
# Run all tests (unit, integration, E2E)
pnpm run test

# Run only unit tests
pnpm run test:unit

# Run end-to-end tests (requires a running test database)
pnpm run test:e2e

# Generate a test coverage report
pnpm run test:cov
```

## ⚙️ 6. Environment Variables

Configuration is loaded from environment variables defined in the `.env` file. See `.env.example` for the complete list of required variables.

**`/.env.example`**

```dotenv
# Application Port
PORT=3000

# Database URL (Prisma convention)
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://admin:password@localhost:5432/twitterx_dev"

# JWT Configuration
JWT_SECRET="your-strong-secret-for-jwt"
JWT_EXPIRATION="1d"
```

## 🎨 7. Coding Conventions

* **Package Manager**: This project strictly uses **pnpm**. Do not use `npm` or `yarn`.
* **Linter & Formatter**: **ESLint** and **Prettier** are configured to enforce a consistent coding style. A pre-commit hook is set up to automatically lint and format staged files.
* **Prisma Workflow**:
    1. Modify your data models in `prisma/schema.prisma`.
    2. Run `pnpm prisma migrate dev --name <migration_name>` to create and apply a new migration.
    3. The `PrismaClient` is updated automatically. You can now use the new models in your services.
