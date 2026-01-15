import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { UserEntity } from '../../../users/domain/entities/user.entity';
import { Public } from '../../../../core/presentation/decorators/public.decorator';
import { CurrentUser } from '../../../../core/presentation/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';
import { MagicLinkThrottleGuard } from '../guards/magic-link-throttle.guard';
import { SendMagicLinkUseCase } from '../../application/use-cases/send-magic-link.use-case';
import { LogoutUseCase } from '../../application/use-cases/logout.use-case';
import { SendMagicLinkDto } from '../../application/dtos';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly sendMagicLinkUseCase: SendMagicLinkUseCase,
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
    const result = await this.sendMagicLinkUseCase.execute(dto);
    return { success: true, data: result };
  }

  @UseGuards(SupabaseAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke Supabase session' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(@CurrentUser('supabaseUserId') supabaseUserId: string) {
    const result = await this.logoutUseCase.execute(supabaseUserId);
    return { success: true, data: result };
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getProfile(@CurrentUser() user: UserEntity) {
    return { success: true, user };
  }
}
