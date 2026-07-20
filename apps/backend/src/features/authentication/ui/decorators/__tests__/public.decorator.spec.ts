import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, Public } from '../public.decorator';

describe('Public decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        jest.clearAllMocks();
        reflector = new Reflector();
    });

    it('exposes the stable metadata key the JWT guard looks up', () => {
        expect(IS_PUBLIC_KEY).toBe('isPublic');
    });

    it('sets the public metadata flag to true on a decorated handler', () => {
        class Controller {
            @Public()
            public handler(): void {
                return undefined;
            }
        }

        expect(reflector.get<boolean>(IS_PUBLIC_KEY, Controller.prototype.handler)).toBe(true);
    });

    it('sets the public metadata flag to true on a decorated class', () => {
        @Public()
        class PublicController {}

        expect(reflector.get<boolean>(IS_PUBLIC_KEY, PublicController)).toBe(true);
    });

    it('leaves the metadata unset on an undecorated handler', () => {
        class Controller {
            public handler(): void {
                return undefined;
            }
        }

        expect(reflector.get<boolean>(IS_PUBLIC_KEY, Controller.prototype.handler)).toBeUndefined();
    });
});
