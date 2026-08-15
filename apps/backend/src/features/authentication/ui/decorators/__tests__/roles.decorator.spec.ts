import { Reflector } from '@nestjs/core';

import { ROLES_KEY, Roles } from '../roles.decorator';

import { UserRole } from '@features/users/domain/models/user.models';

describe('Roles decorator', () => {
    let reflector: Reflector;

    beforeEach(() => {
        jest.clearAllMocks();
        reflector = new Reflector();
    });

    it('exposes the stable metadata key the roles guard looks up', () => {
        expect(ROLES_KEY).toBe('roles');
    });

    it('sets the declared roles on a decorated handler', () => {
        class Controller {
            @Roles(UserRole.Admin)
            public handler(): void {
                return undefined;
            }
        }

        const handler = Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')?.value as () => void;

        expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toEqual([UserRole.Admin]);
    });

    it('keeps every role of a handler that declares several', () => {
        class Controller {
            @Roles(UserRole.Admin, UserRole.User)
            public handler(): void {
                return undefined;
            }
        }

        const handler = Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')?.value as () => void;

        expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toEqual([UserRole.Admin, UserRole.User]);
    });

    it('sets the declared roles on a decorated class', () => {
        @Roles(UserRole.Admin)
        class AdminController {}

        expect(reflector.get<UserRole[]>(ROLES_KEY, AdminController)).toEqual([UserRole.Admin]);
    });

    it('sets an empty role list when the decorator receives no role', () => {
        class Controller {
            @Roles()
            public handler(): void {
                return undefined;
            }
        }

        const handler = Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')?.value as () => void;

        expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toEqual([]);
    });

    it('leaves the metadata unset on an undecorated handler', () => {
        class Controller {
            public handler(): void {
                return undefined;
            }
        }

        const handler = Object.getOwnPropertyDescriptor(Controller.prototype, 'handler')?.value as () => void;

        expect(reflector.get<UserRole[]>(ROLES_KEY, handler)).toBeUndefined();
    });
});
