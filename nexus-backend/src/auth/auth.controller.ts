import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserSummaryDto } from '@/common/dto/user-summary.dto.js';
import { ApiAuth } from '@/common/decorators/api-auth.decorator.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { Public } from '@/common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '@/common/interfaces/authenticated-user.interface.js';

import { AuthService } from './auth.service.js';
import { LoginResponseDto } from './dto/login-response.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password', security: [] })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiAuth()
  @ApiOperation({ summary: 'Return the authenticated user from the access token' })
  @ApiOkResponse({ type: UserSummaryDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
  me(@CurrentUser() user: AuthenticatedUser): UserSummaryDto {
    return user;
  }
}
