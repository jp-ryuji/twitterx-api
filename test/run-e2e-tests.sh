#!/bin/bash

set -euo pipefail

# Load environment variables from .env.test.local
if [ -f .env.test.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.test.local
  set +a
fi

# Set the DATABASE_URL environment variable for tests
export DATABASE_URL="postgresql://${TEST_DB_USERNAME}:${TEST_DB_PASSWORD}@localhost:${TEST_POSTGRES_PORT_EXTERNAL}/${TEST_DB_NAME}"

# Run the tests
jest --config ./test/jest-e2e.json
EXIT_CODE=$?

# Exit with the same code as the tests
exit $EXIT_CODE
