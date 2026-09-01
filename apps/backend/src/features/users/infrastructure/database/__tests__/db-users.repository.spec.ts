import { Repository } from 'typeorm';

import { CreateUserDto } from '../../../domain/dtos/create-user.dto';
import { User, UserRole } from '../../../domain/models/user.models';
import { DbUserEntity } from '../db-user.entity';
import { DatabaseUsersRepository } from '../db-users.repository';

/**
 * Builds a user database-entity fixture, overriding only the fields under test.
 */
const userEntity = (overrides: Partial<DbUserEntity> = {}): DbUserEntity => ({
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'argon2-hash',
    displayName: null,
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseUsersRepository', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbUserEntity>, 'findOneBy' | 'create' | 'merge' | 'save'>>;
    let sut: DatabaseUsersRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
        };
        sut = new DatabaseUsersRepository(mockRepository as unknown as Repository<DbUserEntity>);
    });

    describe('findByEmail', () => {
        it('finds a user by email and maps it into the domain model', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findByEmail(entity.email);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ email: entity.email });
            expect(result).toEqual<User>({
                id: entity.id,
                email: entity.email,
                passwordHash: entity.passwordHash,
                displayName: entity.displayName,
                totpSecret: entity.totpSecret,
                totpEnabledAt: entity.totpEnabledAt,
                role: entity.role,
                isActive: entity.isActive,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
            });
        });

        it('returns null when no user matches the email', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByEmail('ghost@example.com')).toBeNull();
        });
    });

    describe('findById', () => {
        it('finds a user by id and maps it into the domain model', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result?.id).toBe(entity.id);
        });

        it('returns null when no user matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findById('missing')).toBeNull();
        });
    });

    describe('create', () => {
        it('creates and saves the user then returns the mapped domain model', async () => {
            const input: CreateUserDto = {
                email: 'new@example.com',
                passwordHash: 'hash',
                role: UserRole.User,
                isActive: true,
            };
            const entity = userEntity({ email: input.email, role: UserRole.User });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(input);

            expect(mockRepository.create).toHaveBeenCalledWith(input);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result.email).toBe(input.email);
            expect(result.role).toBe(UserRole.User);
        });
    });

    describe('updateDisplayName', () => {
        it('merges the display name into the stored row and returns the mapped user', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ displayName: 'Ada Lovelace' }));

            const result = await sut.updateDisplayName(entity.id, 'Ada Lovelace');

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { displayName: 'Ada Lovelace' });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result?.displayName).toBe('Ada Lovelace');
        });

        it('clears the display name when the caller hands null', async () => {
            const entity = userEntity({ displayName: 'Ada Lovelace' });
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ displayName: null }));

            const result = await sut.updateDisplayName(entity.id, null);

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { displayName: null });
            expect(result?.displayName).toBeNull();
        });

        it('returns null and writes nothing when no user matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.updateDisplayName('missing', 'Ada')).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('updateEmail', () => {
        it('merges the email address into the stored row and returns the mapped user', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ email: 'ada@example.com' }));

            const result = await sut.updateEmail(entity.id, 'ada@example.com');

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { email: 'ada@example.com' });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result?.email).toBe('ada@example.com');
        });

        it('returns null and writes nothing when no user matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.updateEmail('missing', 'ada@example.com')).toBeNull();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('updatePasswordHash', () => {
        it('merges the hash of the password into the stored row and returns the mapped user', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ passwordHash: 'new-argon2-hash' }));

            const result = await sut.updatePasswordHash(entity.id, 'new-argon2-hash');

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { passwordHash: 'new-argon2-hash' });
            expect(result?.passwordHash).toBe('new-argon2-hash');
        });

        it('returns null and writes nothing when no user matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.updatePasswordHash('missing', 'hash')).toBeNull();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('updateTotp', () => {
        it('writes the secret of a setup that nobody confirmed yet', async () => {
            const entity = userEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ totpSecret: 'sealed-secret' }));

            const result = await sut.updateTotp(entity.id, 'sealed-secret', null);

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, {
                totpSecret: 'sealed-secret',
                totpEnabledAt: null,
            });
            expect(result?.totpSecret).toBe('sealed-secret');
            expect(result?.totpEnabledAt).toBeNull();
        });

        it('writes the instant that turns the second factor on', async () => {
            const enabledAt = new Date('2026-07-12T00:00:00.000Z');
            const entity = userEntity({ totpSecret: 'sealed-secret' });
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity({ totpSecret: 'sealed-secret', totpEnabledAt: enabledAt }));

            const result = await sut.updateTotp(entity.id, 'sealed-secret', enabledAt);

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, {
                totpSecret: 'sealed-secret',
                totpEnabledAt: enabledAt,
            });
            expect(result?.totpEnabledAt).toEqual(enabledAt);
        });

        it('clears both columns when the second factor goes off', async () => {
            const entity = userEntity({ totpSecret: 'sealed-secret', totpEnabledAt: new Date('2026-07-12T00:00:00.000Z') });
            mockRepository.findOneBy.mockResolvedValue(entity);
            mockRepository.save.mockResolvedValue(userEntity());

            const result = await sut.updateTotp(entity.id, null, null);

            expect(mockRepository.merge).toHaveBeenCalledWith(entity, { totpSecret: null, totpEnabledAt: null });
            expect(result?.totpSecret).toBeNull();
            expect(result?.totpEnabledAt).toBeNull();
        });

        it('returns null and writes nothing when no user matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.updateTotp('missing', 'sealed-secret', null)).toBeNull();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });
});
