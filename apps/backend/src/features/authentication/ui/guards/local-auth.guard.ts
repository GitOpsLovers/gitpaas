import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { enrichWithAuthOutcome } from '../telemetry/enrich-with-actor';

import { User } from '@features/users/domain/models/user.models';

/**
 * Guard that runs the Passport local strategy for the login route.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {
    public handleRequest<TUser = User>(
        error: unknown,
        user: TUser,
        info: unknown,
        context: ExecutionContext,
        status?: unknown,
    ): TUser {
        const validated = user as User | false | null | undefined;

        if (error || !validated) {
            enrichWithAuthOutcome('rejected');
        }

        return super.handleRequest(error, user, info, context, status);
    }
}
