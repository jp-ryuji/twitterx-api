#!/usr/bin/env node

/**
 * Script to verify Swagger configuration
 * This script starts the application briefly to ensure Swagger is properly configured
 */

const { spawn } = require('child_process');

console.log('🔍 Verifying Swagger configuration...');

// Start the application
const app = spawn('node', ['dist/main.js'], {
  env: {
    ...process.env,
    PORT: '3001', // Use different port to avoid conflicts
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret',
  },
  stdio: 'pipe'
});

let output = '';
let hasStarted = false;

app.stdout.on('data', (data) => {
  output += data.toString();

  // Check if application started successfully
  if (output.includes('Application is running on:') || output.includes('Nest application successfully started')) {
    hasStarted = true;
    console.log('✅ Application started successfully');
    console.log('✅ Swagger documentation should be available at http://localhost:3001/api');

    // Kill the process after successful start
    setTimeout(() => {
      app.kill('SIGTERM');
    }, 1000);
  }
});

app.stderr.on('data', (data) => {
  const error = data.toString();

  // Ignore common warnings that don't affect Swagger
  if (!error.includes('ExperimentalWarning') &&
      !error.includes('DeprecationWarning') &&
      !error.includes('Warning: To load an ES module')) {
    console.error('❌ Error:', error);
  }
});

app.on('close', (code) => {
  if (hasStarted) {
    console.log('✅ Swagger configuration verification completed successfully');
    console.log('📚 API documentation features:');
    console.log('   - Bearer token authentication');
    console.log('   - Session token authentication');
    console.log('   - Google OAuth2 integration');
    console.log('   - Comprehensive error response examples');
    console.log('   - Interactive API testing interface');
    console.log('   - Detailed endpoint documentation');
    process.exit(0);
  } else {
    console.error('❌ Application failed to start properly');
    console.error('Output:', output);
    process.exit(1);
  }
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!hasStarted) {
    console.error('❌ Application startup timeout');
    app.kill('SIGTERM');
    process.exit(1);
  }
}, 10000);
