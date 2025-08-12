#!/bin/bash

set -euo pipefail

# Load environment variables from .env.test.local
if [ -f .env.test.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.test.local
  set +a
fi

# Define the docker-compose file
DOCKER_COMPOSE_FILE="docker-compose.test.yml"

# Start the test database
echo "Starting test database..."
docker compose -f "$DOCKER_COMPOSE_FILE" up -d

# Wait for the database to be ready
echo "Waiting for database to be ready..."
until docker compose -f "$DOCKER_COMPOSE_FILE" exec postgres-test pg_isready -U "$TEST_DB_USERNAME" -d "$TEST_DB_NAME" > /dev/null 2>&1
do
    sleep 1
done

# Set the DATABASE_URL environment variable for tests
export DATABASE_URL="postgresql://${TEST_DB_USERNAME}:${TEST_DB_PASSWORD}@localhost:${TEST_POSTGRES_PORT_EXTERNAL}/${TEST_DB_NAME}"

# Run the tests
jest --config ./test/jest-e2e.json

# Store the exit code
EXIT_CODE=$?

# Stop the test database
echo "Stopping test database..."
docker compose -f "$DOCKER_COMPOSE_FILE" down

# Exit with the same code as the tests
exit $EXIT_CODE
