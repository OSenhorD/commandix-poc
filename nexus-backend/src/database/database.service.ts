import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { db } from '@/prisma/db.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  get orm() {
    return db.orm;
  }

  async onModuleDestroy(): Promise<void> {
    await db.close();
  }
}
