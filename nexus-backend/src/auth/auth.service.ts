import { createHash, randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { DatabaseService } from '@/database/database.service.js';
import { RoleEnum } from '@/common/enums/role.enum.js';

import {
  JWT_REFRESH_EXPIRES_IN,
  type AccessTokenPayload,
} from './auth.constants.js';
import { LoginDto } from './dto/login.dto.js';
import { addDurationFromNow } from './parse-duration.util.js';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: 'ADMIN' | 'VIEWER';
    tenantId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly database: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.database.orm.public.User.where({
      email: dto.email,
    }).first();

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException();
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as RoleEnum,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = addDurationFromNow(JWT_REFRESH_EXPIRES_IN);

    await this.database.orm.public.RefreshToken.create({
      userId: user.id,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
