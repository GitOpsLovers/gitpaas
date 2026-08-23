import { ServiceVariableNotFoundError } from '../../domain/errors/service-variable.errors';
import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { removeServiceVariableUseCase } from '../remove-service-variable.use-case';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const variableId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

/** Builds a domain variable fixture, overriding only the fields under test. */
const variable = (overrides: Partial<ServiceVariable> = {}): ServiceVariable => ({
    id: variableId,
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
    ...overrides,
});

describe('removeServiceVariableUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'findById' | 'delete'>>;

    /** Runs the SUT with the mocked port, applying the cast one time. */
    const run = (): Promise<void> =>
        removeServiceVariableUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            serviceId,
            variableId,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockServiceVariablesRepository = { findById: jest.fn(), delete: jest.fn() };
    });

    it('reads the variable before it removes the row', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockServiceVariablesRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.findById).toHaveBeenCalledWith(variableId);
    });

    it('delegates the removal to the repository with the received id', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.delete.mockResolvedValue(true);

        await run();

        expect(mockServiceVariablesRepository.delete).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.delete).toHaveBeenCalledWith(variableId);
    });

    it('resolves with no value when the row is gone', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.delete.mockResolvedValue(true);

        await expect(run()).resolves.toBeUndefined();
    });

    it('throws when the variable does not exist', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('throws when the variable belongs to a different service', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(
            variable({ serviceId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run()).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('never removes a row that belongs to a different service', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(
            variable({ serviceId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f' }),
        );

        await expect(run()).rejects.toThrow();

        expect(mockServiceVariablesRepository.delete).not.toHaveBeenCalled();
    });

    it('throws when the row disappeared between the read and the removal', async () => {
        mockServiceVariablesRepository.findById.mockResolvedValue(variable());
        mockServiceVariablesRepository.delete.mockResolvedValue(false);

        await expect(run()).rejects.toBeInstanceOf(ServiceVariableNotFoundError);
    });

    it('propagates errors raised by the repository', async () => {
        const error = new Error('db unreachable');
        mockServiceVariablesRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
