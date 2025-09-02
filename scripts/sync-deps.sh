#!/bin/bash

# Script to sync dependencies between local and container environments

echo "Syncing dependencies to Docker containers..."

# Sync API dependencies
echo "Syncing API dependencies..."
docker exec -it twitterx-api-app-1 pnpm install

echo "Dependency sync completed!"
