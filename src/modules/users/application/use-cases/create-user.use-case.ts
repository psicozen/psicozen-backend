import { Injectable, Inject, ConflictException, Logger } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import { SupabaseAdminService } from '../../../../core/infrastructure/supabase/supabase-admin.service';

@Injectable()
export class CreateUserUseCase {
  private readonly logger = new Logger(CreateUserUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly supabaseAdminService: SupabaseAdminService,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    // Verificar se email já existe no banco local
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    let supabaseUserId = dto.supabaseUserId;

    // Se não foi fornecido supabaseUserId, criar usuário no Supabase Auth
    if (!supabaseUserId) {
      try {
        const supabaseUser = await this.supabaseAdminService.inviteUserByEmail(
          dto.email,
        );
        supabaseUserId = supabaseUser.id;
        this.logger.log(
          `User invited in Supabase Auth: ${dto.email} (${supabaseUserId})`,
        );
      } catch (error) {
        this.logger.error(`Failed to create user in Supabase Auth: ${error}`);
        throw new ConflictException(
          'Failed to create user in authentication service. Email may already exist.',
        );
      }
    }

    // Criar nova entidade de usuário
    const user = UserEntity.create(dto.email, supabaseUserId, dto.firstName);

    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.bio) user.bio = dto.bio;
    if (dto.preferences) user.updatePreferences(dto.preferences);

    // Persistir no banco local
    return this.userRepository.create(user);
  }
}
