import { Inject, Injectable } from '@nestjs/common';

import type { PublicHostAddress } from '../../domain/ports/public-host-address.port';
import type { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';

import { DatabasePlatformSettingsRepository } from './db-platform-settings.repository';

/**
 * Database public host address adapter
 */
@Injectable()
export class DatabasePublicHostAddressAdapter implements PublicHostAddress {
    constructor(
        @Inject(DatabasePlatformSettingsRepository)
        private readonly settings: PlatformSettingsRepository,
    ) {}

    public async read(): Promise<string | null> {
        const saved = await this.settings.find();

        return saved?.publicHostAddress ?? null;
    }
}
