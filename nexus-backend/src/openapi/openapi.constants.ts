export function isApiDocsEnabled(): boolean {
  return (process.env['ENABLE_API_DOCS'] ?? 'true').toLowerCase() !== 'false';
}

export const OPENAPI_TITLE = 'Commandix API';
export const OPENAPI_VERSION = '1.0';
export const OPENAPI_SETUP_PATH = '_openapi';
export const OPENAPI_JSON_PATH = 'api/openapi.json';
export const OPENAPI_SCALAR_PATH = '/api/docs';
