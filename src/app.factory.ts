import { INestApplication, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  return app;
}

/**
 * Configures Swagger documentation (production only)
 */
export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('TwitterX API')
    .setDescription('API documentation for TwitterX')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
