import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that runs the Passport local strategy for the login route, validating
 * the submitted email/password and attaching the resolved user to the request.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
