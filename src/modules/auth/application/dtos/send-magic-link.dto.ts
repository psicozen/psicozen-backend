import { IsEmail, IsNotEmpty, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMagicLinkDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({ example: 'http://localhost:3001/auth/callback' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  redirectTo?: string;
}
