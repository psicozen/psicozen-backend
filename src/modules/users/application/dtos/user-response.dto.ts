import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { UserPreferences } from '../../domain/entities/user.entity';

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  firstName?: string;

  @ApiPropertyOptional()
  lastName?: string;

  @ApiPropertyOptional()
  photoUrl?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiProperty()
  preferences: UserPreferences;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  lastLoginAt?: Date;
}
