#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2e70f946b86b01e5c9ab19d707febadf065d73e0cec903104f88f622f0f61593/contract';
import endContract from '../../snapshots/2e70f946b86b01e5c9ab19d707febadf065d73e0cec903104f88f622f0f61593/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b2d4c5ff16c021a87425bdc8004f75e522022fdbbe8efeaf1a54346feec814e2/contract';
import startContract from '../../snapshots/b2d4c5ff16c021a87425bdc8004f75e522022fdbbe8efeaf1a54346feec814e2/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropIndex({
        schema: 'public',
        table: 'integrationExecution',
        index: 'integrationExecution_status_idx_e98638ab',
      }),
      this.addUnique({
        schema: 'public',
        table: 'refreshToken',
        constraint: 'refreshToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'integration',
        index: 'integration_tenantId_updatedAt_idx_dd16144d',
        columns: ['tenantId', 'updatedAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
