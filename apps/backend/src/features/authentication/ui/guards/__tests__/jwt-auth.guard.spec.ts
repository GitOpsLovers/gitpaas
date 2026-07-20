import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';

const handler = (): void => undefined;

class Controller {}

const contextFor = (): ExecutionContext => {
    const mockGetHandler = jest.fn().mockReturnValue(handler);
    const mockGetClass = jest.fn().mockReturnValue(Controller);

    return {
        getHandler: mockGetHandler,
        getClass: mockGetClass,
    } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
    let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    let sut: JwtAuthGuard;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReflector = { getAllAndOverride: jest.fn() };
        sut = new JwtAuthGuard(mockReflector as unknown as Reflector);
        // Stub the passport AuthGuard base so no real strategy runs.
        superCanActivate = jest
            .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
            .mockReturnValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('lets a route flagged @Public() through without invoking the JWT strategy', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = contextFor();

        const result = sut.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        expect(result).toBe(true);
        expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('enforces the JWT strategy for a non-public route', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = contextFor();

        const result = sut.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
        expect(result).toBe(true);
    });

    it('enforces the JWT strategy when the public flag is absent (undefined)', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = contextFor();

        sut.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
    });
});
