import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';

function contextFor(): ExecutionContext {
    const handler = (): void => undefined;

    class Controller {}

    return {
        getHandler: () => handler,
        getClass: () => Controller,
    } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
    let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    let guard: JwtAuthGuard;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        reflector = { getAllAndOverride: jest.fn() };
        guard = new JwtAuthGuard(reflector as unknown as Reflector);
        // Stub the passport AuthGuard base so no real strategy runs.
        superCanActivate = jest
            .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
            .mockReturnValue(true);
    });

    afterEach(() => {
        superCanActivate.mockRestore();
    });

    it('lets a route flagged @Public() through without invoking the JWT strategy', () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const context = contextFor();

        const result = guard.canActivate(context);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        expect(result).toBe(true);
        expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('enforces the JWT strategy for a non-public route', () => {
        reflector.getAllAndOverride.mockReturnValue(false);
        const context = contextFor();

        const result = guard.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
        expect(result).toBe(true);
    });

    it('enforces the JWT strategy when the public flag is absent (undefined)', () => {
        reflector.getAllAndOverride.mockReturnValue(undefined);
        const context = contextFor();

        guard.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
    });
});
