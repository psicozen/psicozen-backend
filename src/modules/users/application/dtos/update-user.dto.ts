import { PartialType, OmitType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['email', 'supabaseUserId'] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photoUrl?: string;
}
