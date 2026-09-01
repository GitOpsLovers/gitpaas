import {
    type CanActivate, type ExecutionContext, HttpException, HttpStatus, Inject, Injectable,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { Request, Response } from 'express';

import { RUNTIME_LOG_STREAM_MAX_CONNECTIONS } from '../../domain/constants/runtime-log-stream.constants';
import type { StreamConnectionRegistry } from '../../domain/ports/stream-connection-registry.port';
import { MemoryStreamConnectionRegistryAdapter } from '../../infrastructure/memory/memory-stream-connection-registry.adapter';

import { User } from '@features/users/domain/models/user.models';

/**
 * Guard that refuses a stream of the output when its user already holds its share of connections.
 */
@Injectable()
export class RuntimeLogStreamGuard implements CanActivate {
    constructor(
        @Inject(MemoryStreamConnectionRegistryAdapter)
        private readonly registry: StreamConnectionRegistry,
    ) {}

    /**
     * Takes one slot of the connections of the user, and gives that slot back when the response ends.
     *
     * @param context Execution context of the request
     *
     * @returns `true` when the user stayed under its limit of the open streams
     *
     * @throws HttpException When the user holds its limit of the open streams already
     */
    public canActivate(context: ExecutionContext): boolean {
        const http = context.switchToHttp();
        const request = http.getRequest<Request & { user?: User }>();
        const response = http.getResponse<Response>();
        const userId = request.user?.id;

        if (userId === undefined) {
            return true;
        }

        if (!this.registry.acquire(userId)) {
            throw new HttpException(
                `You cannot hold more than ${RUNTIME_LOG_STREAM_MAX_CONNECTIONS} log streams open at the same time.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        response.once('close', () => {
            this.registry.release(userId);
        });

        return true;
    }
}
