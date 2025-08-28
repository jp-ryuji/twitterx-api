#!/bin/bash

set -euo pipefail

# Load environment variables from .env.test.local
if [ -f .env.test.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.test.local
  set +a
fi

# Define the compose file and project name
DOCKER_COMPOSE_FILE="compose.test.yml"
PROJECT_NAME="twitterx-api-e2e-test"

# Clean up any existing containers
echo "Cleaning up existing test environment..."
docker compose -p "$PROJECT_NAME" -f "$DOCKER_COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

# Start the test database
echo "Starting test database with project name: $PROJECT_NAME"
docker compose -p "$PROJECT_NAME" -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until docker compose -p "$PROJECT_NAME" -f "$DOCKER_COMPOSE_FILE" exec postgres-test pg_isready -U "$TEST_DB_USER" -d "$TEST_DB_NAME" > /dev/null 2>&1
do
    sleep 1
done

# Set the DATABASE_URL environment variable for tests
export DATABASE_URL="postgresql://${TEST_DB_USER}:${TEST_DB_PASSWORD}@localhost:${TEST_DB_PORT_EXTERNAL}/${TEST_DB_NAME}"

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Run the tests
echo "Running tests..."
npx jest --config ./test/jest-e2e.json
EXIT_CODE=$?

# Stop the test database
echo "Stopping test database..."
docker compose -p "$PROJECT_NAME" -f "$DOCKER_COMPOSE_FILE" down --remove-orphans

# Exit with the same code as the tests
exit $EXIT_CODE
