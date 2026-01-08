import { ApiProperty } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty({ default: 'Bearer' })
  tokenType: string;
}

export class UserPayloadDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ nullable: true })
  firstName?: string;

  @ApiProperty({ nullable: true })
  lastName?: string;
}

export class AuthResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;

  @ApiProperty({ type: UserPayloadDto })
  user: UserPayloadDto;
}
