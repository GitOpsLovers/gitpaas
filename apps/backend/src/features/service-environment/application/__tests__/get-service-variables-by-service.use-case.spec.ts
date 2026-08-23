import { ServiceVariable } from '../../domain/models/service-variable.models';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { getServiceVariablesByServiceUseCase } from '../get-service-variables-by-service.use-case';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';

/** Builds a domain variable fixture, overriding only the fields under test. */
const variable = (overrides: Partial<ServiceVariable> = {}): ServiceVariable => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    serviceId,
    name: 'DATABASE_URL',
    secret: false,
    value: 'postgres://localhost:5432/app',
    valueSet: true,
    ...overrides,
});

describe('getServiceVariablesByServiceUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getByService'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockServiceVariablesRepository = { getByService: jest.fn() };
    });

    it('delegates the read to the repository with the received service id', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([variable()]);

        await getServiceVariablesByServiceUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            serviceId,
        );

        expect(mockServiceVariablesRepository.getByService).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.getByService).toHaveBeenCalledWith(serviceId);
    });

    it('returns the variables the repository produced', async () => {
        const variables = [variable()];
        mockServiceVariablesRepository.getByService.mockResolvedValue(variables);

        const result = await getServiceVariablesByServiceUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            serviceId,
        );

        expect(result).toBe(variables);
    });

    it('returns an empty list when the service holds no variable', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([]);

        const result = await getServiceVariablesByServiceUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            serviceId,
        );

        expect(result).toEqual([]);
    });

    it('never carries the value of a secret, because the repository gives none', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([
            variable({ name: 'API_KEY', secret: true, value: null, valueSet: true }),
        ]);

        const result = await getServiceVariablesByServiceUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            serviceId,
        );

        expect(result[0].value).toBeNull();
        expect(result[0].valueSet).toBe(true);
    });

    it('propagates errors raised by the repository', async () => {
        const error = new Error('db unreachable');
        mockServiceVariablesRepository.getByService.mockRejectedValue(error);

        await expect(
            getServiceVariablesByServiceUseCase(
                mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
                serviceId,
            ),
        ).rejects.toThrow(error);
    });
});
