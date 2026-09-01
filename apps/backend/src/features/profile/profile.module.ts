import { Module } from '@nestjs/common';

import { ProfileController } from './ui/controllers/profile.controller';
import { ProfileService } from './ui/services/profile.service';

import { AuthenticationModule } from '@features/authentication/authentication.module';
import { UsersModule } from '@features/users/users.module';
import { SharedModule } from '@shared/shared.module';

/**
 * Profile feature module.
 */
@Module({
    imports: [UsersModule, AuthenticationModule, SharedModule],
    controllers: [ProfileController],
    providers: [ProfileService],
})
export class ProfileModule {}
