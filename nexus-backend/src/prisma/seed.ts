import 'dotenv/config';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcrypt';

import { db } from '@/prisma/db.js';

const SEED_PASSWORD = 'Admin123!';

type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type JsonObject = { [key: string]: JsonValue };

type SeedRole = 'ADMIN' | 'VIEWER';
type SeedIntegrationType = 'WEBHOOK' | 'REST_API' | 'N8N';
type SeedExecutionStatus = 'SUCCESS' | 'FAILURE';

interface SeedUser {
  email: string;
  role: SeedRole;
}

interface SeedExecution {
  /** Deslocamento em horas a partir do momento do seed — mantém o histórico "recente" a cada subida. */
  hoursAgo: number;
  status: SeedExecutionStatus;
  httpStatusCode: number | null;
  responseTimeMs: number;
  requestPayload: JsonObject;
  responseBody: string;
}

interface SeedIntegration {
  name: string;
  type: SeedIntegrationType;
  targetUrl: string;
  authKey?: string;
  customHeaders?: JsonObject;
  defaultPayload?: JsonObject;
  isActive: boolean;
  executions: SeedExecution[];
}

interface SeedTenant {
  slug: string;
  name: string;
  users: SeedUser[];
  integrations: SeedIntegration[];
}

const TENANTS: SeedTenant[] = [
  {
    slug: 'acme',
    name: 'Acme Corp',
    users: [
      { email: 'admin@acme.com', role: 'ADMIN' },
      { email: 'viewer@acme.com', role: 'VIEWER' },
    ],
    integrations: [
      {
        name: 'Echo Webhook',
        type: 'WEBHOOK',
        targetUrl: 'https://webhook.site/echo',
        defaultPayload: { source: 'commandix' },
        isActive: true,
        executions: [
          {
            hoursAgo: 2,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 184,
            requestPayload: { source: 'commandix', event: 'order.created' },
            responseBody: '{"ok":true,"id":"evt_9f21"}',
          },
          {
            hoursAgo: 9,
            status: 'SUCCESS',
            httpStatusCode: 202,
            responseTimeMs: 231,
            requestPayload: { source: 'commandix', event: 'order.updated' },
            responseBody: '{"ok":true,"queued":true}',
          },
          {
            hoursAgo: 26,
            status: 'FAILURE',
            httpStatusCode: 500,
            responseTimeMs: 1_842,
            requestPayload: { source: 'commandix', event: 'order.created' },
            responseBody: '{"error":"internal server error"}',
          },
          {
            hoursAgo: 51,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 167,
            requestPayload: { source: 'commandix', event: 'order.cancelled' },
            responseBody: '{"ok":true,"id":"evt_7c04"}',
          },
          {
            hoursAgo: 74,
            status: 'FAILURE',
            httpStatusCode: null,
            responseTimeMs: 30_000,
            requestPayload: { source: 'commandix', event: 'order.created' },
            responseBody: 'timeout of 30000ms exceeded',
          },
        ],
      },
      {
        name: 'CRM Sync',
        type: 'REST_API',
        targetUrl: 'https://api.acme.example.com/v1/leads',
        authKey: 'acme-crm-key',
        customHeaders: { 'X-Acme-Source': 'commandix' },
        defaultPayload: { pipeline: 'inbound' },
        isActive: false,
        executions: [
          {
            hoursAgo: 30,
            status: 'SUCCESS',
            httpStatusCode: 201,
            responseTimeMs: 412,
            requestPayload: { pipeline: 'inbound', leadId: 'ld_1041' },
            responseBody: '{"id":"ld_1041","status":"created"}',
          },
          {
            hoursAgo: 55,
            status: 'FAILURE',
            httpStatusCode: 401,
            responseTimeMs: 128,
            requestPayload: { pipeline: 'inbound', leadId: 'ld_1042' },
            responseBody: '{"error":"invalid api key"}',
          },
          {
            hoursAgo: 98,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 356,
            requestPayload: { pipeline: 'inbound', leadId: 'ld_1043' },
            responseBody: '{"id":"ld_1043","status":"updated"}',
          },
        ],
      },
      {
        name: 'n8n Demo Flow',
        type: 'N8N',
        targetUrl: 'http://n8n:5678/webhook/commandix-demo',
        defaultPayload: { message: 'Olá do Commandix' },
        isActive: true,
        executions: [
          {
            hoursAgo: 5,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 274,
            requestPayload: { message: 'Olá do Commandix' },
            responseBody: '{"echo":{"message":"Olá do Commandix"}}',
          },
          {
            hoursAgo: 121,
            status: 'FAILURE',
            httpStatusCode: 404,
            responseTimeMs: 96,
            requestPayload: { message: 'Olá do Commandix' },
            responseBody: '{"message":"webhook not registered"}',
          },
        ],
      },
    ],
  },
  {
    slug: 'globex',
    name: 'Globex Industries',
    users: [
      { email: 'admin@globex.com', role: 'ADMIN' },
      { email: 'viewer@globex.com', role: 'VIEWER' },
    ],
    integrations: [
      {
        name: 'Order Webhook',
        type: 'WEBHOOK',
        targetUrl: 'https://webhook.site/globex-orders',
        defaultPayload: { source: 'commandix', warehouse: 'SP-01' },
        isActive: true,
        executions: [
          {
            hoursAgo: 1,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 143,
            requestPayload: {
              source: 'commandix',
              warehouse: 'SP-01',
              orderId: 'ord_5501',
            },
            responseBody: '{"ok":true}',
          },
          {
            hoursAgo: 12,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 158,
            requestPayload: {
              source: 'commandix',
              warehouse: 'SP-01',
              orderId: 'ord_5502',
            },
            responseBody: '{"ok":true}',
          },
          {
            hoursAgo: 34,
            status: 'FAILURE',
            httpStatusCode: 429,
            responseTimeMs: 89,
            requestPayload: {
              source: 'commandix',
              warehouse: 'SP-01',
              orderId: 'ord_5503',
            },
            responseBody: '{"error":"rate limit exceeded"}',
          },
          {
            hoursAgo: 67,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 201,
            requestPayload: {
              source: 'commandix',
              warehouse: 'SP-01',
              orderId: 'ord_5504',
            },
            responseBody: '{"ok":true}',
          },
          {
            hoursAgo: 110,
            status: 'FAILURE',
            httpStatusCode: null,
            responseTimeMs: 30_000,
            requestPayload: {
              source: 'commandix',
              warehouse: 'SP-01',
              orderId: 'ord_5505',
            },
            responseBody: 'connect ECONNREFUSED',
          },
        ],
      },
      {
        name: 'Billing API',
        type: 'REST_API',
        targetUrl: 'https://api.globex.example.com/v1/invoices',
        authKey: 'globex-billing-key',
        customHeaders: { 'X-Globex-Tenant': 'globex' },
        isActive: true,
        executions: [
          {
            hoursAgo: 7,
            status: 'SUCCESS',
            httpStatusCode: 201,
            responseTimeMs: 523,
            requestPayload: { invoiceId: 'inv_301', amount: 1290.5 },
            responseBody: '{"id":"inv_301","status":"issued"}',
          },
          {
            hoursAgo: 41,
            status: 'FAILURE',
            httpStatusCode: 422,
            responseTimeMs: 245,
            requestPayload: { invoiceId: 'inv_302', amount: -10 },
            responseBody: '{"error":"amount must be positive"}',
          },
          {
            hoursAgo: 88,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 389,
            requestPayload: { invoiceId: 'inv_303', amount: 4780 },
            responseBody: '{"id":"inv_303","status":"paid"}',
          },
        ],
      },
      {
        name: 'n8n WhatsApp Alerts',
        type: 'N8N',
        targetUrl: 'http://n8n:5678/webhook/commandix-whatsapp',
        defaultPayload: {
          number: '5511999999999',
          text: 'Alerta do Commandix',
        },
        isActive: false,
        executions: [
          {
            hoursAgo: 19,
            status: 'SUCCESS',
            httpStatusCode: 200,
            responseTimeMs: 812,
            requestPayload: {
              number: '5511999999999',
              text: 'Alerta do Commandix',
            },
            responseBody: '{"status":"sent"}',
          },
          {
            hoursAgo: 143,
            status: 'FAILURE',
            httpStatusCode: 400,
            responseTimeMs: 174,
            requestPayload: { number: '', text: 'Alerta do Commandix' },
            responseBody: '{"error":"number is required"}',
          },
        ],
      },
    ],
  },
];

export type SeedResult = 'skipped' | 'completed';

function hoursAgoToIso(hoursAgo: number, now: number): string {
  return new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
}

async function seedTenant(
  spec: SeedTenant,
  passwordHash: string,
): Promise<void> {
  const now = Date.now();

  const tenant = await db.orm.public.Tenant.create({
    name: spec.name,
    slug: spec.slug,
  });

  for (const user of spec.users) {
    await db.orm.public.User.create({
      tenantId: tenant.id,
      email: user.email,
      passwordHash,
      role: user.role,
    });
  }

  for (const integrationSpec of spec.integrations) {
    const integration = await db.orm.public.Integration.create({
      tenantId: tenant.id,
      name: integrationSpec.name,
      type: integrationSpec.type,
      targetUrl: integrationSpec.targetUrl,
      authKey: integrationSpec.authKey ?? null,
      customHeaders: integrationSpec.customHeaders ?? null,
      defaultPayload: integrationSpec.defaultPayload ?? null,
      isActive: integrationSpec.isActive,
    });

    for (const execution of integrationSpec.executions) {
      await db.orm.public.IntegrationExecution.create({
        integrationId: integration.id,
        status: execution.status,
        httpStatusCode: execution.httpStatusCode,
        responseTimeMs: execution.responseTimeMs,
        requestPayload: execution.requestPayload,
        responseBody: execution.responseBody,
        executedAt: hoursAgoToIso(execution.hoursAgo, now),
      });
    }
  }
}

export async function runSeed(): Promise<SeedResult> {
  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);
  let created = 0;

  for (const spec of TENANTS) {
    const existingTenant = await db.orm.public.Tenant.where({
      slug: spec.slug,
    }).first();

    if (existingTenant) {
      continue;
    }

    await seedTenant(spec, passwordHash);
    created += 1;
  }

  return created === 0 ? 'skipped' : 'completed';
}

async function main(): Promise<void> {
  const result = await runSeed();

  if (result === 'skipped') {
    console.log('Seed skipped: all seed tenants already exist.');
    return;
  }

  const integrations = TENANTS.reduce(
    (total, tenant) => total + tenant.integrations.length,
    0,
  );
  const executions = TENANTS.reduce(
    (total, tenant) =>
      total +
      tenant.integrations.reduce(
        (subtotal, integration) => subtotal + integration.executions.length,
        0,
      ),
    0,
  );

  console.log(
    `Seed completed: ${String(TENANTS.length)} tenants, ${String(integrations)} integrations, ${String(executions)} executions.`,
  );
}

const isDirectRun =
  process.argv[1] != null &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}
