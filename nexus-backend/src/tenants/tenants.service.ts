import { ConflictException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

import { DatabaseService } from '@/database/database.service.js';

import { BootstrapTenantDto } from './dto/bootstrap-tenant.dto.js';

export interface BootstrapTenantResponse {
  tenant: {
    id: string;
    slug: string;
    name: string;
  };
  user: {
    id: string;
    tenantId: string;
    email: string;
    role: 'ADMIN';
  };
}

@Injectable()
export class TenantsService {
  constructor(private readonly database: DatabaseService) {}

  async bootstrap(dto: BootstrapTenantDto): Promise<BootstrapTenantResponse> {
    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);

    return this.database.transaction(async (tx) => {
      const existingSlug = await tx.orm.public.Tenant.where({
        slug: dto.tenantSlug,
      }).first();

      if (existingSlug) {
        throw new ConflictException();
      }

      const existingEmail = await tx.orm.public.User.where({
        email: dto.adminEmail,
      }).first();

      if (existingEmail) {
        throw new ConflictException();
      }

      const tenant = await tx.orm.public.Tenant.create({
        name: dto.tenantName,
        slug: dto.tenantSlug,
      });

      const user = await tx.orm.public.User.create({
        tenantId: tenant.id,
        email: dto.adminEmail,
        passwordHash,
        role: 'ADMIN',
      });

      return {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        user: {
          id: user.id,
          email: user.email,
          role: 'ADMIN',
          tenantId: user.tenantId,
        },
      };
    });
  }
}
