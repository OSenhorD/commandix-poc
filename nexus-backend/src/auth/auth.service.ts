import { randomBytes } from 'node:crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { RoleEnum } from '@/common/enums/role.enum.js';
import { DatabaseService } from '@/database/database.service.js';

import {
  JWT_REFRESH_EXPIRES_IN,
  type AccessTokenPayload,
} from './auth.constants.js';
import { LoginDto } from './dto/login.dto.js';
import { LogoutDto } from './dto/logout.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';
import { hashRefreshToken } from './hash-refresh-token.util.js';
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
    const tokenHash = hashRefreshToken(refreshToken);
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

  async refresh(dto: RefreshDto): Promise<{ accessToken: string }> {
    const storedToken = await this.findValidRefreshToken(dto.refreshToken);
    const user = await this.database.orm.public.User.where({
      id: storedToken.userId,
    }).first();

    if (!user) {
      throw new UnauthorizedException();
    }

    const payload: AccessTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as RoleEnum,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async logout(_dto: LogoutDto): Promise<void> {
    const tokenHash = hashRefreshToken(_dto.refreshToken);
    const storedToken = await this.database.orm.public.RefreshToken.where({
      tokenHash,
    }).first();

    if (!storedToken || storedToken.revokedAt !== null) {
      return;
    }

    await this.database.orm.public.RefreshToken.where({
      id: storedToken.id,
    }).update({
      revokedAt: new Date().toISOString(),
    });
  }

  private async findValidRefreshToken(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await this.database.orm.public.RefreshToken.where({
      tokenHash,
    }).first();

    if (!storedToken || storedToken.revokedAt !== null) {
      throw new UnauthorizedException();
    }

    if (new Date(storedToken.expiresAt) <= new Date()) {
      throw new UnauthorizedException();
    }

    return storedToken;
  }
}
