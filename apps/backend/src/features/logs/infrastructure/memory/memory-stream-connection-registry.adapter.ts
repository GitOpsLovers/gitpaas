import { Injectable } from '@nestjs/common';

import { RUNTIME_LOG_STREAM_MAX_CONNECTIONS } from '../../domain/constants/runtime-log-stream.constants';
import { StreamConnectionRegistry } from '../../domain/ports/stream-connection-registry.port';

/**
 * Registry that counts the live connections of each user in the memory of the process.
 */
@Injectable()
export class MemoryStreamConnectionRegistryAdapter implements StreamConnectionRegistry {
    /**
     * The number of the connections that stay open, keyed by the identifier of their user.
     */
    private readonly connections = new Map<string, number>();

    public acquire(userId: string): boolean {
        const open = this.connections.get(userId) ?? 0;

        if (open >= RUNTIME_LOG_STREAM_MAX_CONNECTIONS) {
            return false;
        }

        this.connections.set(userId, open + 1);

        return true;
    }

    public release(userId: string): void {
        const open = this.connections.get(userId) ?? 0;

        if (open <= 1) {
            this.connections.delete(userId);

            return;
        }

        this.connections.set(userId, open - 1);
    }
}
