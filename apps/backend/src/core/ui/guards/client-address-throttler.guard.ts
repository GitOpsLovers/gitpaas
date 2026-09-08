import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

import { resolveClientAddressUseCase } from '../../application/resolve-client-address.use-case';

/**
 * Rate limit guard that counts the requests against the real address of the client.
 */
@Injectable()
export class ClientAddressThrottlerGuard extends ThrottlerGuard {
    /**
     * Resolves the tracker the storage of the limit counts against.
     *
     * @param request Inbound request
     *
     * @returns The address of the client
     */
    protected override getTracker(request: Record<string, unknown>): Promise<string> {
        return Promise.resolve(resolveClientAddressUseCase(request.ip));
    }
}
