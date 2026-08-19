/* eslint-disable no-secrets/no-secrets */
import {
    ProviderRegistrationExpiredError,
    ProviderRegistrationNotFoundError,
    ProviderRegistrationStepError,
} from '../../domain/errors/provider-registration.errors';
import {
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationConversion,
    ProviderRegistrationStep,
} from '../../domain/models/provider-registration.models';
import { ProviderClient } from '../../domain/ports/provider-client.port';
import { ProviderRegistrationsRepository } from '../../domain/repositories/provider-registrations.repository';
import { convertProviderRegistrationUseCase } from '../convert-provider-registration.use-case';

describe('convertProviderRegistrationUseCase', () => {
    const now = new Date('2026-01-01T01:00:00.000Z');
    const state = 'f'.repeat(64);
    const code = 'temporary-code';

    /** Builds a pending registration fixture, overriding only the fields under test. */
    const registrationOf = (overrides: Partial<ProviderRegistration> = {}): ProviderRegistration => ({
        id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        state,
        name: 'acme',
        ownerType: ProviderAppOwnerType.Personal,
        ownerLogin: null,
        step: ProviderRegistrationStep.AwaitingCreation,
        appId: null,
        appSlug: null,
        encryptedPrivateKey: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T12:00:00.000Z'),
        ...overrides,
    });

    const conversion: ProviderRegistrationConversion = {
        appId: '123456',
        appSlug: 'acme-gitpaas',
        privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIEow\n-----END RSA PRIVATE KEY-----',
    };

    const converted = registrationOf({
        step: ProviderRegistrationStep.AwaitingInstallation,
        appId: conversion.appId,
        appSlug: conversion.appSlug,
        encryptedPrivateKey: 'iv:tag:cipher',
    });

    let mockRegistrationsRepository: jest.Mocked<Pick<ProviderRegistrationsRepository, 'findByState' | 'saveConversion'>>;
    let mockProviderClient: jest.Mocked<Pick<ProviderClient, 'convertAppManifest'>>;

    /** Runs the use case with the mocked port and repository. */
    const run = (): ReturnType<typeof convertProviderRegistrationUseCase> =>
        convertProviderRegistrationUseCase(
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            mockProviderClient as unknown as ProviderClient,
            state,
            code,
            now,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockRegistrationsRepository = {
            findByState: jest.fn().mockResolvedValue(registrationOf()),
            saveConversion: jest.fn().mockResolvedValue(converted),
        };
        mockProviderClient = { convertAppManifest: jest.fn().mockResolvedValue(conversion) };
    });

    describe('when the registration awaits the creation', () => {
        it('reads the row by its state', async () => {
            await run();

            expect(mockRegistrationsRepository.findByState).toHaveBeenCalledWith(state);
        });

        it('converts the code with the provider client', async () => {
            await run();

            expect(mockProviderClient.convertAppManifest).toHaveBeenCalledTimes(1);
            expect(mockProviderClient.convertAppManifest).toHaveBeenCalledWith(code);
        });

        it('writes the configuration of the application into the row', async () => {
            await run();

            expect(mockRegistrationsRepository.saveConversion).toHaveBeenCalledWith(state, conversion);
        });

        it('answers with the row that moved to the step of the installation', async () => {
            const result = await run();

            expect(result).toBe(converted);
            expect(result.step).toBe(ProviderRegistrationStep.AwaitingInstallation);
        });

        it('gives back no private key in clear', async () => {
            const result = await run();

            expect(JSON.stringify(result)).not.toContain(conversion.privateKey);
        });
    });

    describe('when the state names no registration', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(null);
        });

        it('throws a ProviderRegistrationNotFoundError', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationNotFoundError);
        });

        it('calls the provider no time, and changes no record', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationNotFoundError);

            expect(mockProviderClient.convertAppManifest).not.toHaveBeenCalled();
            expect(mockRegistrationsRepository.saveConversion).not.toHaveBeenCalled();
        });
    });

    describe('when the registration passed the date of the end of its life', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(
                registrationOf({ expiresAt: new Date('2026-01-01T00:30:00.000Z') }),
            );
        });

        it('throws a ProviderRegistrationExpiredError', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationExpiredError);
        });

        it('calls the provider no time, and changes no record', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationExpiredError);

            expect(mockProviderClient.convertAppManifest).not.toHaveBeenCalled();
            expect(mockRegistrationsRepository.saveConversion).not.toHaveBeenCalled();
        });
    });

    describe('when the registration already passed the conversion', () => {
        beforeEach(() => {
            mockRegistrationsRepository.findByState.mockResolvedValue(converted);
        });

        it('throws a ProviderRegistrationStepError', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationStepError);
        });

        it('calls the provider no time, and changes no record', async () => {
            await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationStepError);

            expect(mockProviderClient.convertAppManifest).not.toHaveBeenCalled();
            expect(mockRegistrationsRepository.saveConversion).not.toHaveBeenCalled();
        });
    });

    it('propagates the failure the provider raises for a code it refuses', async () => {
        const error = new Error('the code is used or too old');
        mockProviderClient.convertAppManifest.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
        expect(mockRegistrationsRepository.saveConversion).not.toHaveBeenCalled();
    });

    it('throws a ProviderRegistrationNotFoundError when the row disappeared before the write', async () => {
        mockRegistrationsRepository.saveConversion.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProviderRegistrationNotFoundError);
    });
});
