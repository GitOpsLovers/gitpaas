import { ServiceVariable, ServiceVariableRow } from '../../domain/models/service-variable.models';
import { ComposeEnvironmentCacheStore } from '../../domain/ports/compose-environment-cache-store.port';
import { ServiceVariablesRepository } from '../../domain/repositories/service-variables.repository';
import { getServiceVariablesByServiceUseCase } from '../get-service-variables-by-service.use-case';

import { ComposeEnvironmentCache } from '@features/services/domain/models/compose-environment.models';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const refreshedAt = new Date('2026-01-02T03:04:05.000Z');

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

/** Builds the cache of the compose file of the service, with the names it declares. */
const cache = (variables: Record<string, string>): ComposeEnvironmentCache => ({ variables, refreshedAt });

describe('getServiceVariablesByServiceUseCase', () => {
    let mockServiceVariablesRepository: jest.Mocked<Pick<ServiceVariablesRepository, 'getByService'>>;
    let mockComposeEnvironmentCacheStore: jest.Mocked<Pick<ComposeEnvironmentCacheStore, 'findByService'>>;

    /** Runs the SUT with the mocked ports, applying the casts one time. */
    const run = (): Promise<ServiceVariableRow[]> =>
        getServiceVariablesByServiceUseCase(
            mockServiceVariablesRepository as unknown as ServiceVariablesRepository,
            mockComposeEnvironmentCacheStore as unknown as ComposeEnvironmentCacheStore,
            serviceId,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockServiceVariablesRepository = { getByService: jest.fn() };
        mockComposeEnvironmentCacheStore = { findByService: jest.fn() };
        mockServiceVariablesRepository.getByService.mockResolvedValue([]);
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(null);
    });

    it('delegates the two reads with the received service id', async () => {
        await run();

        expect(mockServiceVariablesRepository.getByService).toHaveBeenCalledTimes(1);
        expect(mockServiceVariablesRepository.getByService).toHaveBeenCalledWith(serviceId);
        expect(mockComposeEnvironmentCacheStore.findByService).toHaveBeenCalledTimes(1);
        expect(mockComposeEnvironmentCacheStore.findByService).toHaveBeenCalledWith(serviceId);
    });

    it('returns an empty list when the service holds no variable and no cache', async () => {
        expect(await run()).toEqual([]);
    });

    it('marks a row of the table that the compose file does not declare as one of the user', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([variable()]);

        const result = await run();

        expect(result).toEqual([{ ...variable(), origin: 'user', composeRefreshedAt: null }]);
    });

    it('marks a row of the table as one of the user when GitPaaS never read the compose file', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([variable()]);
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(null);

        const result = await run();

        expect(result[0].origin).toBe('user');
        expect(result[0].composeRefreshedAt).toBeNull();
    });

    it('keeps the value of the table for a name that both sides hold, and gives one row alone', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([variable()]);
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(
            cache({ DATABASE_URL: 'postgres://compose:5432/app' }),
        );

        const result = await run();

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            ...variable(),
            origin: 'compose',
            composeRefreshedAt: refreshedAt,
        });
    });

    it('never gives the value of the cache to a secret that both sides hold', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([
            variable({ name: 'API_KEY', secret: true, value: null }),
        ]);
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(cache({ API_KEY: 's3cr3t' }));

        const result = await run();

        expect(result[0].value).toBeNull();
        expect(result[0].valueSet).toBe(true);
        expect(result[0].origin).toBe('compose');
    });

    it('gives the value of the cache to a name that the table does not hold, and marks the row as unsaved', async () => {
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(cache({ PORT: '8080' }));

        const result = await run();

        expect(result).toEqual([{
            id: null,
            serviceId,
            name: 'PORT',
            secret: false,
            value: '8080',
            valueSet: true,
            origin: 'compose',
            composeRefreshedAt: refreshedAt,
        }]);
    });

    it('marks a name of the compose file that holds no value as one with no value set', async () => {
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(cache({ PORT: '' }));

        const result = await run();

        expect(result[0].value).toBe('');
        expect(result[0].valueSet).toBe(false);
    });

    it('orders the union by name', async () => {
        mockServiceVariablesRepository.getByService.mockResolvedValue([
            variable({ name: 'DATABASE_URL' }),
            variable({ name: 'ZONE' }),
        ]);
        mockComposeEnvironmentCacheStore.findByService.mockResolvedValue(cache({ APP_ENV: 'production', PORT: '8080' }));

        const result = await run();

        expect(result.map((row) => row.name)).toEqual(['APP_ENV', 'DATABASE_URL', 'PORT', 'ZONE']);
    });

    it('propagates errors raised by the repository', async () => {
        const error = new Error('db unreachable');
        mockServiceVariablesRepository.getByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });

    it('propagates errors raised by the store of the cache', async () => {
        const error = new Error('db unreachable');
        mockComposeEnvironmentCacheStore.findByService.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
