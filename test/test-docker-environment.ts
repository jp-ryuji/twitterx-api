import { execSync } from 'child_process';
import { TestEnvironment } from 'jest-environment-node';
import { join } from 'path';

class TestDockerEnvironment extends TestEnvironment {
  private dockerComposeFile: string;

  constructor(config: any, context: any) {
    super(config, context);
    // Use absolute path to the docker-compose file
    this.dockerComposeFile = join(
      __dirname,
      '..',
      '..',
      'docker-compose.test.yml',
    );
  }

  async setup() {
    // Start the test database
    console.log('Starting test database...');
    execSync(`docker compose -f ${this.dockerComposeFile} up -d`, {
      stdio: 'inherit',
    });

    // Wait for the database to be ready
    console.log('Waiting for database to be ready...');
    await this.waitForDatabase();

    // Set the DATABASE_URL environment variable for the test database
    process.env.DATABASE_URL =
      'postgresql://testuser:testpassword@localhost:5434/testdb';

    await super.setup();
  }

  async teardown() {
    await super.teardown();

    // Stop the test database
    console.log('Stopping test database...');
    execSync(`docker compose -f ${this.dockerComposeFile} down`, {
      stdio: 'inherit',
    });
  }

  private async waitForDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database startup timeout'));
      }, 30000); // 30 seconds timeout

      const checkDatabase = () => {
        try {
          execSync(
            'docker compose -f ' +
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
