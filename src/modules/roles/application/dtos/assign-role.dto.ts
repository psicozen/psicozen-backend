import { IsUUID, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../domain/enums/role.enum';

/**
 * DTO para atribuir papel a um usuário
 */
export class AssignRoleDto {
  @ApiProperty({
    description: 'ID do usuário que receberá o papel',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID(4, { message: 'userId deve ser um UUID válido' })
  userId: string;

  @ApiProperty({
    enum: Role,
    description: 'Nome do papel a ser atribuído',
    example: Role.ADMIN,
    enumName: 'Role',
  })
  @IsEnum(Role, { message: 'roleName deve ser um papel válido' })
  roleName: Role;

  @ApiPropertyOptional({
    description:
      'ID da organização onde o papel será atribuído (obrigatório para papéis não-globais como ADMIN, GESTOR, COLABORADOR)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsOptional()
  @IsUUID(4, { message: 'organizationId deve ser um UUID válido' })
  organizationId?: string;
}
