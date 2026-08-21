import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

import { UnauthenticatedError } from '../../domain/errors/authentication.errors';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

import { enrichTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User } from '@features/users/domain/models/user.models';

/**
 * Global authentication guard based on the Passport JWT strategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    constructor(private readonly reflector: Reflector) {
        super();
    }

    /**
     * Allow public routes through untouched.
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
            enrichTelemetry({ 'auth.public_route': true, 'auth.outcome': 'anonymous' });

            return true;
        }

        enrichTelemetry({ 'auth.public_route': false });

        return super.canActivate(context);
    }

    /**
     * Record the outcome of the strategy, and reject a request that resolved no user with the `UNAUTHENTICATED` cause.
     *
     * @param error Error raised by the strategy, if any
     * @param user User resolved by the strategy, if any
     * @param info Extra information given by the strategy
     * @param context Current execution context
     * @param status Status suggested by the strategy
     *
     * @returns The authenticated user
     */
    public handleRequest<TUser = User>(
        error: unknown,
        user: TUser,
        info: unknown,
        context: ExecutionContext,
        status?: unknown,
    ): TUser {
        const authenticated = user as User | false | null | undefined;

        if (!error && authenticated) {
            enrichTelemetry({
                'auth.outcome': 'authenticated',
                'user.id': authenticated.id,
                'user.role': authenticated.role,
            });

            return super.handleRequest(error, user, info, context, status);
        }

        enrichTelemetry({ 'auth.outcome': 'rejected' });

        if (error) {
            return super.handleRequest(error, user, info, context, status);
        }

        throw new UnauthorizedException(undefined, { cause: new UnauthenticatedError() });
    }
}
