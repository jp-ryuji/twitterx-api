import { NestFactory } from '@nestjs/core';

import { configureApp, configureSwagger } from './app.factory';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apply common application configuration
  configureApp(app);

  // Configure Swagger for production
  configureSwagger(app);

  await app.listen(process.env.PORT ?? 3000);

  // enable shutdown hook
  const prismaService = app.get(PrismaService);
  void prismaService.enableShutdownHooks(app);
}
void bootstrap();
