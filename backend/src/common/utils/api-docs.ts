import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { API_DOCS_PATH } from '../../config/constants';

/** Builds the OpenAPI description of every controller in the app. */
export function buildApiDocument(
  app: INestApplication,
  serviceName: string,
): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle(`${serviceName} API`)
    .setDescription('Forever Hotel backend service')
    .setVersion('0.1.0')
    .build();
  return SwaggerModule.createDocument(app, config);
}

/** Serves Swagger UI at /docs and the JSON spec at /docs-json. */
export function setupApiDocs(app: INestApplication, serviceName: string): void {
  SwaggerModule.setup(API_DOCS_PATH, app, buildApiDocument(app, serviceName));
}
