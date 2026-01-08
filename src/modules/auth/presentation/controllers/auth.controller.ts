import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import type { Request } from 'express';
import { Public } from '../../../../core/presentation/decorators/public.decorator';
import { CurrentUser } from '../../../../core/presentation/decorators/current-user.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { MagicLinkThrottleGuard } from '../guards/magic-link-throttle.guard';
import { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.use-case';
import { VerifyMagicLinkUseCase } from '../../application/use-cases/verify-magic-link.use-case';
import { RefreshTokenUseCase } from '../../application/use-cases/refresh-token.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import {
  SendMagicLinkDto,
  VerifyMagicLinkDto,
  RefreshTokenDto,
  AuthResponseDto,
} from '../../application/dtos';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sendMagicLinkUseCase: SendMagicLinkUseCase,
    private readonly verifyMagicLinkUseCase: VerifyMagicLinkUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly logoutUseCase: LogoutUseCase,
  ) {}

  @Public()
  @UseGuards(MagicLinkThrottleGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @Post('send-magic-link')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send magic link to email for passwordless login' })
  @ApiResponse({ status: 200, description: 'Magic link sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email or Supabase error' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async sendMagicLink(@Body() dto: SendMagicLinkDto) {
    return this.sendMagicLinkUseCase.execute(dto);
  }

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Verify magic link token and generate JWT' })
  @ApiQuery({ name: 'token_hash', type: String })
  @ApiQuery({ name: 'type', type: String })
  @ApiResponse({ status: 200, description: 'Authentication successful', type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid or expired magic link' })
  async verifyMagicLink(
    @Query() dto: VerifyMagicLinkDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.verifyMagicLinkUseCase.execute(dto, ipAddress, userAgent);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.refreshTokenUseCase.execute(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke session(s)' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: { type: 'string', description: 'Optional: specific session to logout' },
      },
    },
    required: false,
  })
  async logout(
    @CurrentUser('id') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.logoutUseCase.execute(userId, refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: UserEntity) {
    return { success: true, user };
  }
}
