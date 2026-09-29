import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppLogger } from './common/utils/app-logger';
import { AppConfig } from './config/configuration';
import { DEFAULT_SERVICE_NAME } from './config/constants';

async function bootstrap(): Promise<void> {
  // Log immediately (e.g. database retry messages) using the process environment;
  // .env is not loaded yet, so local runs start with defaults in text format.
  const app = await NestFactory.create(AppModule, {
    logger: new AppLogger(
      process.env.LOG_FORMAT === 'json' ? 'json' : 'text',
      process.env.SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
    ),
  });
  const appConfig = app.get(ConfigService).getOrThrow<AppConfig>('app');

  // Switch to the validated configuration once it is available.
  app.useLogger(new AppLogger(appConfig.logFormat, appConfig.serviceName));
  app.enableShutdownHooks();

  await app.listen(appConfig.port);
}

void bootstrap();
