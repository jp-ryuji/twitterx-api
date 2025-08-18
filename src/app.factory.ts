import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { GlobalExceptionFilter } from './common/filters';

/**
 * Configures a NestJS application with common settings used in both
 * production and test environments
 */
export function configureApp(app: INestApplication): INestApplication {
  // Enable URI versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Configure global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configure global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Middleware is applied in the AppModule configuration, not here
  // See app.module.ts for middleware registration

  return app;
}

/**
 * Configures Swagger documentation (production only)
 */
export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TwitterX API')
    .setDescription(
      'A comprehensive backend service that replicates core X (formerly Twitter) functionalities. ' +
        'This API provides user authentication, profile management, and social features with modern security practices.',
    )
    .setVersion('1.0')
    .setContact(
      'TwitterX API Support',
      'https://github.com/your-repo/twitterx-api',
      'support@twitterx-api.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.twitterx.com', 'Production server')
    // Add Bearer token authentication scheme
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'bearer', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    // Add session token authentication scheme
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        description: 'Session token in format: Bearer <session_token>',
      },
      'session', // This name is used to reference this scheme
    )
    // Add OAuth2 scheme for Google OAuth
    .addOAuth2(
      {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://accounts.google.com/o/oauth2/auth',
            tokenUrl: 'https://oauth2.googleapis.com/token',
            scopes: {
              openid: 'OpenID Connect',
              profile: 'Access to user profile information',
              email: 'Access to user email address',
            },
          },
        },
      },
      'google-oauth',
    )
    .addTag('Authentication', 'User registration, login, and OAuth endpoints')
    .addTag('User Management', 'User profile and account management endpoints')
    .addTag(
      'Admin - User Moderation',
      'Administrative user moderation endpoints',
    )
    .addTag(
      'Admin - Security',
      'Administrative security and monitoring endpoints',
    )
    .addTag('Health', 'System health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  // Customize the document with additional information
  document.info.termsOfService = 'https://twitterx-api.com/terms';
  document.externalDocs = {
    description: 'Find more info here',
    url: 'https://docs.twitterx-api.com',
  };

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'TwitterX API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #1DA1F2; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });
}
