import { afterAll, describe, expect, it } from 'vitest';

import { db } from '../src/prisma/db.js';
import { runSeed } from '../src/prisma/seed.js';

const hasDatabase = Boolean(process.env['DATABASE_URL']);

describe.skipIf(!hasDatabase)('Seed (e2e)', () => {
  afterAll(async () => {
    await db.close();
  });

  it('is idempotent — second run skips without duplicating tenant', async () => {
    await runSeed();
    const secondResult = await runSeed();

    expect(secondResult).toBe('skipped');

    const tenants = await db.orm.public.Tenant.where({ slug: 'acme' }).all();

    expect(tenants).toHaveLength(1);
  });
});
