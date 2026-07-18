import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, Public } from '../public.decorator';

describe('Public decorator', () => {
    it('sets the public metadata flag to true on the decorated handler', () => {
        class Controller {
            @Public()
            public handler(): void {
                return undefined;
            }
        }

        const reflector = new Reflector();

        expect(reflector.get<boolean>(IS_PUBLIC_KEY, Controller.prototype.handler)).toBe(true);
    });

    it('exposes the metadata key under which the flag is stored', () => {
        expect(IS_PUBLIC_KEY).toBe('isPublic');
    });
});
