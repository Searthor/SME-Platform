import { Module } from '@nestjs/common'
import { UsersService } from './application/users.service'
import { UsersRepository } from './infrastructure/users.repository'

@Module({ providers: [UsersRepository, UsersService], exports: [UsersRepository, UsersService] })
export class UsersModule {}
