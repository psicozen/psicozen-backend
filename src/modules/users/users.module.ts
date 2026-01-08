import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Infrastructure - Persistence
import { UserSchema } from './infrastructure/persistence/user.schema';

// Infrastructure - Repositories
import { UserRepository } from './infrastructure/repositories/user.repository';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';

// Application - Use Cases
import {
  CreateUserUseCase,
  UpdateUserUseCase,
  GetUserUseCase,
  DeleteUserUseCase,
  ListUsersUseCase,
} from './application/use-cases';

// Presentation - Controllers
import { UsersController } from './presentation/controllers/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserSchema])],
  controllers: [UsersController],
  providers: [
    // Repositories
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },

    // Use Cases
    CreateUserUseCase,
    UpdateUserUseCase,
    GetUserUseCase,
    DeleteUserUseCase,
    ListUsersUseCase,
  ],
  exports: [USER_REPOSITORY],
})
export class UsersModule {}
