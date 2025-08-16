import { execSync } from 'child_process';
import { join } from 'path';

import {
  TestEnvironment,
  JestEnvironmentConfig,
  EnvironmentContext,
} from 'jest-environment-node';

class TestDockerEnvironment extends TestEnvironment {
  private dockerComposeFile: string;
  private projectName: string;

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);
    // Use absolute path to the docker-compose file
    this.dockerComposeFile = join(process.cwd(), 'docker-compose.test.yml');
    // Use a specific project name to avoid conflicts
    this.projectName = 'twitterx-api-e2e-test';
  }

  async setup() {
    // Set environment variables for custom ports
    process.env.TEST_POSTGRES_PORT_EXTERNAL = '5434';
    process.env.TEST_REDIS_PORT_EXTERNAL = '6380';

    // Clean up any existing containers/networks
    try {
      execSync(
        `docker compose -p ${this.projectName} -f ${this.dockerComposeFile} down --remove-orphans`,
        {
          stdio: 'pipe',
        },
      );
    } catch (error) {
      // Ignore errors during cleanup
    }

    // Start the test database
    console.log('Starting test database...');
    try {
      execSync(
        `docker compose -p ${this.projectName} -f ${this.dockerComposeFile} up -d`,
        {
          stdio: 'inherit',
        },
      );
    } catch (error) {
      console.error('Failed to start Docker containers:', error);
      throw error;
    }

    // Wait for the database to be ready
    console.log('Waiting for database to be ready...');
    await this.waitForDatabase();

    // Set the DATABASE_URL environment variable for the test database
    process.env.DATABASE_URL =
      'postgresql://testuser:testpassword@localhost:5434/testdb';

    // Run database migrations
    console.log('Running database migrations...');
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL:
            'postgresql://testuser:testpassword@localhost:5434/testdb',
        },
      });
    } catch (error) {
      console.error('Failed to run migrations:', error);
      throw error;
    }

    await super.setup();
  }

  async teardown() {
    await super.teardown();

    // Stop the test database
    console.log('Stopping test database...');
    try {
      execSync(
        `docker compose -p ${this.projectName} -f ${this.dockerComposeFile} down --remove-orphans`,
        {
          stdio: 'inherit',
        },
      );
    } catch (error) {
      // Ignore errors during teardown
      if (error instanceof Error) {
        console.warn('Warning: Failed to stop test database:', error.message);
      } else {
        console.warn('Warning: Failed to stop test database:', error);
      }
    }
  }

  private async waitForDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database startup timeout'));
      }, 30000); // 30 seconds timeout

      const checkDatabase = () => {
        try {
          execSync(
            'docker compose -p ' +
              this.projectName +
              ' -f ' +
              this.dockerComposeFile +
              ' exec postgres-test pg_isready -U testuser -d testdb',
            {
              stdio: 'pipe',
            },
          );
          clearTimeout(timeout);
          resolve();
        } catch {
          setTimeout(checkDatabase, 1000); // Check every second
        }
      };

      checkDatabase();
    });
  }
}

export default TestDockerEnvironment;
