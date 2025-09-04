#!/bin/bash

# Script to sync dependencies between local and container environments

echo "Syncing dependencies to Docker containers..."

# Sync API dependencies
echo "Syncing API dependencies..."
# Using docker compose to ensure we're targeting the correct container
docker compose exec app pnpm install

echo "Dependency sync completed!"
