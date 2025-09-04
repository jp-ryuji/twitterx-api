# Docker Volume Configuration

This project uses a combination of bind mounts and anonymous volumes for optimal cross-platform compatibility:

```yaml
volumes:
  - .:/app                  # Mount entire project
  - /app/node_modules       # Anonymous volume for node_modules
```

This configuration:

1. Mounts the entire project directory to `/app` in the container
2. Uses an anonymous volume for `/app/node_modules` to isolate container dependencies
3. Prevents binary compatibility issues between macOS and Alpine Linux

## Benefits of This Approach

1. **Cross-Platform Compatibility**: Works reliably between macOS development and Alpine Linux containers
2. **File System Isolation**: Prevents issues with binary modules
3. **Source Code Synchronization**: All source code changes are immediately reflected in containers
4. **Automatic Dependency Management**: Dependencies are automatically checked and installed when containers start

## Workflow

When adding new packages:

1. Install new packages locally: `pnpm add <package>`
2. Restart the container to automatically install new dependencies: `pnpm docker:restart`
3. Alternatively, manually sync dependencies with: `pnpm docker:sync`

## Why Not Direct node_modules Mounting?

Directly mounting `./node_modules:/app/node_modules` can cause issues:

1. **Binary Incompatibility**: Native modules compiled on macOS won't work on Alpine Linux
2. **File System Differences**: Different file systems can cause permission and performance issues
3. **Path Issues**: Different operating systems handle paths differently

The anonymous volume approach provides better isolation while still allowing immediate source code synchronization and automated dependency management.
