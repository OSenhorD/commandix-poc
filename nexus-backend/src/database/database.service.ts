import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { db } from '@/prisma/db.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  get orm() {
    return db.orm;
  }

  transaction<T>(fn: Parameters<typeof db.transaction>[0]): Promise<T> {
    return db.transaction(fn) as Promise<T>;
  }

  async onModuleDestroy(): Promise<void> {
    await db.close();
  }
}
