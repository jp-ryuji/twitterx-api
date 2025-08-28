# AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

* **Primary Goal:** This is a REST API backend for a social media application that replicates core functionalities of X (formerly Twitter). It serves as a portfolio piece demonstrating proficiency in modern backend engineering with NestJS, TypeScript, and Prisma.
* **Business Domain:** Social Media

## 2. Core Technologies & Stack

* **Languages:** TypeScript
* **Frameworks & Runtimes:** Node.js v22, NestJS, Express.js
* **Databases:** PostgreSQL (primary), Redis (for sessions)
* **Key Libraries/Dependencies:**
  * `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: Core NestJS libraries
  * `@nestjs/jwt`, `@nestjs/passport`: Authentication
  * `@nestjs/swagger`: API documentation
  * `@prisma/client`: Database ORM
  * `bcrypt`: Password hashing
  * `class-transformer`, `class-validator`: Data validation and transformation
  * `passport`, `passport-google-oauth20`, `passport-jwt`: Authentication strategies
  * `redis`: Redis client
  * `nodemailer`: Email sending
  * `rxjs`: Reactive programming
* **Package Manager(s):** pnpm

## 3. Architectural Patterns

* **Overall Architecture:** Modular monolithic application built with NestJS. Features are organized into modules (auth, user, etc.) that are self-contained and import shared services like Prisma for database access.
* **Directory Structure Philosophy:**
  * `/src`: Contains all primary source code, organized by NestJS modules
  * `/src/auth`: Authentication (JWT, OAuth) functionality
  * `/src/user`: User management
  * `/src/prisma`: Prisma service for database access
  * `/src/common`: Shared modules, services, guards, filters
  * `/prisma`: Prisma schema and migrations
  * `/test`: End-to-end tests
  * `/docs`: API documentation

## 4. Coding Conventions & Style Guide

* **Formatting:** Prettier with single quotes and trailing commas. 2-space indentation. Unix-style line endings (LF). Files must end with a newline.
* **Naming Conventions:**
  * `variables`, `functions`: camelCase (`myVariable`)
  * `classes`, `components`: PascalCase (`MyClass`)
  * `files`: kebab-case (`my-component.ts`)
* **API Design:** RESTful principles with URI-based versioning (e.g., `/v1/users`). Uses standard HTTP verbs (GET, POST, PUT, DELETE). JSON for request/response bodies. Comprehensive Swagger documentation.
* **Error Handling:** Global exception filter for consistent error responses. Custom exception classes for specific error cases.

## 5. Key Files & Entrypoints

* **Main Entrypoint(s):** `src/main.ts`
* **Configuration:**
  * `.env` (environment variables)
  * `src/app.module.ts` (NestJS module configuration)
  * `prisma/schema.prisma` (database schema)
* **CI/CD Pipeline:** GitHub Actions workflows (inferred from recent commits)

## 6. Development & Testing Workflow

* **Local Development Environment:**
    1. Install dependencies with `pnpm install`
    2. Set up environment with `cp .env.example .env`
    3. Start services with `docker compose up -d`
    4. Run migrations with `pnpm prisma migrate dev`
    5. Start development server with `pnpm run start:dev`

* **Testing:**
  * Unit tests: `pnpm run test`
  * End-to-end tests: `pnpm run test:e2e` (automatically manages test database)
  * Test coverage: `pnpm run test:cov`
  * Uses Jest for testing framework and mocks Prisma for unit tests

* **CI/CD Process:** GitHub Actions for continuous integration

## 7. Specific Instructions for AI Collaboration

* **Infrastructure (IaC):** Docker Compose is used for local development and testing environments. Changes to `compose.yml` or `Dockerfile` affect the deployment environment.
* **Security:** Do not hardcode secrets or keys. Authentication logic uses JWT tokens and sessions. Passwords are properly hashed with bcrypt. OAuth2 flows are implemented for Google authentication.
* **Dependencies:** When adding a new dependency, use `pnpm add <package>` for production dependencies or `pnpm add -D <package>` for development dependencies.
* **Commit Messages:** Follow conventional commits format (e.g., `feat:`, `fix:`, `docs:`). Package.json and lock file changes should be committed separately, including the names of added or deleted packages.
