import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';

import {
  isApiDocsEnabled,
  OPENAPI_JSON_PATH,
  OPENAPI_SCALAR_PATH,
  OPENAPI_SETUP_PATH,
  OPENAPI_TITLE,
  OPENAPI_VERSION,
} from '@/openapi/openapi.constants.js';
import { swaggerDocumentOptions } from '@/openapi/swagger-document.options.js';

export function configureOpenApi(app: INestApplication): void {
  if (!isApiDocsEnabled()) {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle(OPENAPI_TITLE)
    .setDescription(
      [
        'Commandix PoC — gestão de integrações multi-tenant.',
        '',
        '**Autenticação:**',
        '1. `POST /api/v1/auth/login`',
        '2. Authorize com Bearer `{accessToken}`',
        '3. Chamar rotas protegidas',
      ].join('\n'),
    )
    .setVersion(OPENAPI_VERSION)
    .addBearerAuth()
    .addGlobalResponse({
      status: 401,
      description: 'Missing or invalid access token',
    })
    .addGlobalResponse({
      status: 500,
      description: 'Internal server error',
    })
    .addTag('health')
    .addTag('tenants')
    .addTag('auth')
    .addTag('integrations')
    .addTag('executions')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, config, swaggerDocumentOptions);

  SwaggerModule.setup(OPENAPI_SETUP_PATH, app, documentFactory, {
    ui: false,
    raw: ['json'],
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });

  app.use(
    OPENAPI_SCALAR_PATH,
    apiReference({
      theme: 'default',
      url: `/${OPENAPI_JSON_PATH}`,
    }),
  );
}
