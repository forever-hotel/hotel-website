import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../config/configuration';
import { DatabaseService } from '../database/database.service';

export interface HealthResponse {
  status: 'ok';
  service: string;
  database: 'up';
}

/** Readiness endpoint for Docker health checks, CI smoke tests and monitoring. */
@Controller('health')
export class HealthController {
  private readonly serviceName: string;

  constructor(
    private readonly databaseService: DatabaseService,
    configService: ConfigService,
  ) {
    this.serviceName = configService.getOrThrow<AppConfig>('app').serviceName;
  }

  @Get()
  async check(): Promise<HealthResponse> {
    const databaseUp = await this.databaseService.isHealthy();

    if (!databaseUp) {
      throw new ServiceUnavailableException({
        error: 'DATABASE_UNAVAILABLE',
        message: 'The database is not reachable.',
      });
    }

    return { status: 'ok', service: this.serviceName, database: 'up' };
  }
}
