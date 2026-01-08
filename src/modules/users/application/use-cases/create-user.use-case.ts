import { Injectable, Inject, ConflictException } from '@nestjs/common';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { USER_REPOSITORY } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(dto: CreateUserDto): Promise<UserEntity> {
    // Verificar se email já existe
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Criar nova entidade de usuário
    const user = UserEntity.create(
      dto.email,
      dto.supabaseUserId,
      dto.firstName,
    );

    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.bio) user.bio = dto.bio;

    // Persistir
    return this.userRepository.create(user);
  }
}
