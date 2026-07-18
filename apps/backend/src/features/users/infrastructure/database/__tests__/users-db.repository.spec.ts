import { Repository } from 'typeorm';

import { CreateUserDto } from '../../../domain/dtos/create-user.dto';
import { User, UserRole } from '../../../domain/models/user.model';
import { UserDbEntity } from '../user-db.entity';
import { UsersDatabaseRepository } from '../users-db.repository';

function userEntity(overrides: Partial<UserDbEntity> = {}): UserDbEntity {
    return {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        email: 'admin@example.com',
        passwordHash: 'argon2-hash',
        role: UserRole.Admin,
        isActive: true,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

describe('UsersDatabaseRepository', () => {
    let mockRepo: {
        findOneBy: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
    };
    let repository: UsersDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        };
        repository = new UsersDatabaseRepository(mockRepo as unknown as Repository<UserDbEntity>);
    });

    describe('findByEmail', () => {
        it('finds a user by email and maps it into the domain model', async () => {
            const entity = userEntity();
            mockRepo.findOneBy.mockResolvedValue(entity);

            const result = await repository.findByEmail(entity.email);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ email: entity.email });
            expect(result).toEqual<User>({
                id: entity.id,
                email: entity.email,
                passwordHash: entity.passwordHash,
                role: entity.role,
                isActive: entity.isActive,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
            });
        });

        it('returns null when no user matches the email', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            expect(await repository.findByEmail('ghost@example.com')).toBeNull();
        });
    });

    describe('findById', () => {
        it('finds a user by id and maps it into the domain model', async () => {
            const entity = userEntity();
            mockRepo.findOneBy.mockResolvedValue(entity);

            const result = await repository.findById(entity.id);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result?.id).toBe(entity.id);
        });

        it('returns null when no user matches the id', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            expect(await repository.findById('missing')).toBeNull();
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
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(entity);

            const result = await repository.create(input);

            expect(mockRepo.create).toHaveBeenCalledWith(input);
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result.email).toBe(input.email);
            expect(result.role).toBe(UserRole.User);
        });
    });
});
