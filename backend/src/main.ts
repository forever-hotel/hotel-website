import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { setupApiDocs } from './common/utils/api-docs';
import { AppLogger } from './common/utils/app-logger';
import { reportStartupFailure } from './common/utils/startup-failure';
import { AppConfig } from './config/configuration';
import { DEFAULT_SERVICE_NAME, LOG_LEVELS } from './config/constants';

async function bootstrap(): Promise<void> {
  // Log immediately (e.g. database retry messages) using the process environment;
  // .env is not loaded yet, so local runs start with defaults in text format.
  const earlyLevel = LOG_LEVELS.find(
    (level) => level === process.env.LOG_LEVEL,
  );
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new AppLogger(
      process.env.LOG_FORMAT === 'json' ? 'json' : 'text',
      process.env.SERVICE_NAME ?? DEFAULT_SERVICE_NAME,
      earlyLevel ?? 'log',
    ),
  });
  const appConfig = app.get(ConfigService).getOrThrow<AppConfig>('app');

  // Switch to the validated configuration once it is available.
  app.useLogger(
    new AppLogger(
      appConfig.logFormat,
      appConfig.serviceName,
      appConfig.logLevel,
    ),
  );
  app.enableShutdownHooks();

  // API docs for developers and testers; never exposed in production.
  if (appConfig.nodeEnv !== 'production') {
    setupApiDocs(app, appConfig.serviceName);
  }

  await app.listen(appConfig.port);
}

bootstrap().catch((error: unknown) => reportStartupFailure(error));
