# AI Collaboration Guide

This document provides essential context for AI models interacting with this project. Adhering to these guidelines will ensure consistency and maintain code quality.

## 1. Project Overview & Purpose

* **Primary Goal:** This project is a REST API backend built with NestJS. Based on the name "twitterx-api", it is likely intended to be an API for a social media application with functionality similar to Twitter/X.
* **Business Domain:** Social Media

## 2. Core Technologies & Stack

* **Languages:** TypeScript
* **Frameworks & Runtimes:** Node.js, NestJS, Express.js
* **Databases:** PostgreSQL
* **Key Libraries/Dependencies:**
    * `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`: Core NestJS libraries.
    * `rxjs`: Reactive programming library, a core dependency of NestJS.
    * `jest`: Testing framework.
    * `prettier`: Code formatter.
    * `eslint`: Linter.
* **Package Manager(s):** pnpm

## 3. Architectural Patterns

* **Overall Architecture:** The project follows the modular architecture inherent to NestJS. It appears to be a monolithic application.
* **Directory Structure Philosophy:**
    * `/src`: Contains all primary source code, organized by NestJS modules, controllers, and services.
    * `/test`: Contains end-to-end tests.
    * `nest-cli.json`: NestJS CLI configuration file.
    * `tsconfig.json`: TypeScript compiler configuration.
    * `eslint.config.mjs`: ESLint configuration for code linting.

## 4. Coding Conventions & Style Guide

* **Formatting:** The project uses Prettier for code formatting. The configuration is likely in `.prettierrc` or the `prettier` key in `package.json`. The command `npm run format` can be used to format the code.
* **Naming Conventions:** Based on the initial files, the project follows standard TypeScript and NestJS conventions:
    * `variables`, `functions`: camelCase (`myVariable`)
    * `classes`, `components`: PascalCase (`AppService`)
    * `files`: kebab-case for modules and components (`app.controller.ts`)
* **API Design:** (Inferred) As a NestJS project, it will follow RESTful principles. Endpoints are defined in controllers and are typically plural nouns. It uses standard HTTP verbs (GET, POST, PUT, DELETE). JSON is used for request/response bodies.
* **Error Handling:** (Inferred) NestJS has built-in exception handling. Custom error handling can be implemented using exception filters.
* **File Requirements:** All files must end with exactly one newline character to prevent "No newline at end of file" linting warnings and ensure POSIX compliance.

## 5. Key Files & Entrypoints

* **Main Entrypoint(s):** `src/main.ts` is the main entrypoint of the application.
* **Configuration:**
    * `package.json`: Defines project metadata, dependencies, and scripts.
    * `nest-cli.json`: NestJS-specific configuration.
    * `tsconfig.json`: TypeScript configuration.
* **CI/CD Pipeline:** No CI/CD pipeline is configured at this time.

## 6. Development & Testing Workflow

* **Local Development Environment:**
    * To install dependencies: `pnpm install`
    * To run the development server: `npm run start:dev`
* **Testing:**
    * To run unit tests: `npm test`
    * To run end-to-end tests: `npm run test:e2e`
    * Tests are written with Jest and Supertest. Test files are located in `src` for unit tests (`.spec.ts`) and `test` for e2e tests (`.e2e-spec.ts`).
* **CI/CD Process:** No CI/CD process is currently defined.

## 7. Specific Instructions for AI Collaboration

* **Contribution Guidelines:** No `CONTRIBUTING.md` file was found. It is recommended to create one.
* **Infrastructure (IaC):** No Infrastructure as Code directory was found.
* **Security:** Be mindful of security. Do not hardcode secrets or keys. Ensure any changes to authentication logic are secure and vetted.
* **Dependencies:** When adding a new dependency, use `pnpm add <package-name>` or `pnpm add -D <package-name>` for development dependencies.
* **Commit Messages:** No specific commit message format is enforced. It is recommended to follow the Conventional Commits specification (e.g., `feat:`, `fix:`, `docs:`). Commit package.json and lock file changes separately, including the names of added or deleted packages in the message (e.g., 'chore: add lodash', 'chore: remove moment.js').
