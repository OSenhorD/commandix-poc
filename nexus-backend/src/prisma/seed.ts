import 'dotenv/config';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import bcrypt from 'bcrypt';

import { db } from './db.js';

const SEED_PASSWORD = 'Admin123!';
const TENANT_SLUG = 'acme';

export type SeedResult = 'skipped' | 'completed';

export async function runSeed(): Promise<SeedResult> {
  const existingTenant = await db.orm.public.Tenant.where({ slug: TENANT_SLUG }).first();

  if (existingTenant) {
    return 'skipped';
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10);

  const tenant = await db.orm.public.Tenant.create({
    name: 'Acme Corp',
    slug: TENANT_SLUG,
  });

  await db.orm.public.User.create({
    tenantId: tenant.id,
    email: 'admin@acme.com',
    passwordHash,
    role: 'ADMIN',
  });

  await db.orm.public.User.create({
    tenantId: tenant.id,
    email: 'viewer@acme.com',
    passwordHash,
    role: 'VIEWER',
  });

  await db.orm.public.Integration.create({
    tenantId: tenant.id,
    name: 'Echo Webhook',
    type: 'WEBHOOK',
    targetUrl: 'https://webhook.site/echo',
    defaultPayload: { source: 'commandix' },
    isActive: true,
  });

  return 'completed';
}

async function main(): Promise<void> {
  const result = await runSeed();

  if (result === 'skipped') {
    console.log(`Seed skipped: tenant "${TENANT_SLUG}" already exists.`);
    return;
  }

  console.log('Seed completed: tenant acme with admin, viewer and Echo Webhook.');
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
