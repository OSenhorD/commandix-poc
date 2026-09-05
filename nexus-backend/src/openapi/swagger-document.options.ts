import type { SwaggerDocumentOptions } from '@nestjs/swagger';

export const swaggerDocumentOptions: SwaggerDocumentOptions = {
  operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
  deepScanRoutes: true,
  autoTagControllers: true,
};
