import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Returns true when the database answers a trivial query. */
  async isHealthy(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      // Log only the error type; driver messages can include connection details.
      this.logger.error(
        `Database health check failed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
      return false;
    }
  }
}
