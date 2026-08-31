import { Inject, Injectable } from '@nestjs/common';

import { PUBLIC_ADDRESS_TIMEOUT_MS, PUBLIC_ADDRESS_URL } from '../../domain/constants/platform-settings.constants';
import type { PublicHostAddress } from '../../domain/ports/public-host-address.port';

import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';

/**
 * HTTP public host address adapter
 */
@Injectable()
export class HttpPublicHostAddressAdapter implements PublicHostAddress {
    constructor(@Inject(NestLoggerAdapter) private readonly logger: AppLogger) {}

    public async read(): Promise<string | null> {
        try {
            const response = await fetch(PUBLIC_ADDRESS_URL, {
                signal: AbortSignal.timeout(PUBLIC_ADDRESS_TIMEOUT_MS),
            });

            if (!response.ok) {
                this.logger.warn(
                    `The address service answered ${response.status} to the read of the address of this host`,
                    HttpPublicHostAddressAdapter.name,
                );

                return null;
            }

            const address = (await response.text()).trim();

            return address === '' ? null : address;
        } catch (error) {
            this.logger.warn(
                `Could not read the public address of this host: ${error instanceof Error ? error.message : String(error)}`,
                HttpPublicHostAddressAdapter.name,
            );

            return null;
        }
    }
}
