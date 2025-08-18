import { NestFactory } from '@nestjs/core';

import cookieParser from 'cookie-parser';

import { configureApp, configureSwagger } from './app.factory';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply common application configuration
  configureApp(app);

  // Add cookie parser middleware for CSRF protection
  app.use(cookieParser());

  // Configure Swagger for production
  configureSwagger(app);

  await app.listen(process.env.PORT ?? 3000);

  // enable shutdown hook
  const prismaService = app.get(PrismaService);
  void prismaService.enableShutdownHooks(app);
}
void bootstrap();
