import { Injectable, type NestMiddleware } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-redeclare
import type { NextFunction, Request, Response } from 'express';

import { resolveRequestIdUseCase } from '../../application/resolve-request-id.use-case';

/**
 * Header carrying the correlation id, both inbound and outbound.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Global middleware that stamps every request with a correlation id.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
    public use(request: Request, response: Response, next: NextFunction): void {
        // eslint-disable-next-line security/detect-object-injection
        const requestId = resolveRequestIdUseCase(request.headers[REQUEST_ID_HEADER]);

        // eslint-disable-next-line security/detect-object-injection
        request.headers[REQUEST_ID_HEADER] = requestId;
        response.setHeader('X-Request-Id', requestId);

        next();
    }
}
