import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('TwitterX API')
    .setDescription('API documentation for TwitterX')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);

  // enable shutdown hook
  const prismaService = app.get(PrismaService);
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  prismaService.enableShutdownHooks(app);
}
bootstrap();
