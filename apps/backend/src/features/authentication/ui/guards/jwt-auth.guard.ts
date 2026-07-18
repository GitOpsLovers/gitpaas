import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global authentication guard based on the Passport JWT strategy. Protects
 * every route by default, letting through only handlers (or controllers)
 * explicitly annotated with {@link Public}.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    /**
     * Allow public routes through untouched; otherwise enforce a valid access
     * token via the JWT strategy.
     *
     * @param context Current execution context
     *
     * @returns Whether the request may proceed
     */
    public canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        return super.canActivate(context);
    }
}
