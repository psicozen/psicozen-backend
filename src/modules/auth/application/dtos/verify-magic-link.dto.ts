import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMagicLinkDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  token_hash: string;

  @ApiProperty({ enum: ['magiclink', 'recovery', 'invite', 'email_change'] })
  @IsNotEmpty()
  @IsString()
  type: string;
}
