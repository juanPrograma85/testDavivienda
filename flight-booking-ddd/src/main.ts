import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const corsOrigins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({ origin: corsOrigins });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  setupSwagger(app);
  await app.listen(config.get<number>('PORT', 3000), '0.0.0.0');
}

void bootstrap();