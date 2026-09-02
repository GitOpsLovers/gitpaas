import type { UpdatePlatformSettingsDto, UpdatePlatformSettingsResult } from '@gitpaas/contracts';

import { CLOUDFLARE_PROVIDER_NAME } from '../../domain/constants/cloudflare-ranges.constants';
import { CONTROL_PLANE_ENV_PATH } from '../../domain/constants/platform-settings.constants';
import {
    ControlPlaneEnvWriteError,
    GitpaasDomainNotPointingAtHostError,
    HostAddressUnknownError,
    InvalidGitpaasDomainError,
    InvalidLogRetentionError,
} from '../../domain/errors/server.errors';
import type { ControlPlaneDomainCheck } from '../../domain/models/control-plane-domain.models';
import type { CloudflareRanges } from '../../domain/ports/cloudflare-ranges.port';
import type { ControlPlaneEnvFile } from '../../domain/ports/control-plane-env-file.port';
import type { DnsResolver } from '../../domain/ports/dns-resolver.port';
import type { PublicHostAddress } from '../../domain/ports/public-host-address.port';
import { PlatformSettingsRepository } from '../../domain/repositories/platform-settings.repository';
import { checkControlPlaneDomainUseCase } from '../check-control-plane-domain.use-case';
import { updatePlatformSettingsUseCase } from '../update-platform-settings.use-case';

jest.mock('../check-control-plane-domain.use-case');

const mockCheckControlPlaneDomainUseCase = checkControlPlaneDomainUseCase as jest.MockedFunction<
    typeof checkControlPlaneDomainUseCase
>;

/** Builds the answer of the check of the domain, overriding only the fields under test. */
const domainCheck = (overrides: Partial<ControlPlaneDomainCheck> = {}): ControlPlaneDomainCheck => ({
    host: 'gitpaas.example.com',
    resolvedAddresses: ['203.0.113.10'],
    hostAddress: '203.0.113.10',
    pointsAtHost: true,
    provider: null,
    reason: null,
    ...overrides,
});

/** Builds the answer of a check that fails, so the write asks the operator for a confirmation. */
const failedCheck = (overrides: Partial<ControlPlaneDomainCheck> = {}): ControlPlaneDomainCheck =>
    domainCheck({
        resolvedAddresses: ['198.51.100.7'], pointsAtHost: false, reason: 'mismatch', ...overrides,
    });

describe('updatePlatformSettingsUseCase', () => {
    let mockPlatformSettingsRepository: jest.Mocked<Pick<PlatformSettingsRepository, 'save'>>;
    let mockDnsResolver: jest.Mocked<Pick<DnsResolver, 'resolveAddresses'>>;
    let mockPublicHostAddress: jest.Mocked<Pick<PublicHostAddress, 'read'>>;
    let mockCloudflareRanges: jest.Mocked<Pick<CloudflareRanges, 'readRanges'>>;
    let mockControlPlaneEnvFile: jest.Mocked<Pick<ControlPlaneEnvFile, 'writeDomain'>>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockPlatformSettingsRepository = { save: jest.fn() };
        mockDnsResolver = { resolveAddresses: jest.fn() };
        mockPublicHostAddress = { read: jest.fn() };
        mockCloudflareRanges = { readRanges: jest.fn() };
        mockControlPlaneEnvFile = { writeDomain: jest.fn() };
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(domainCheck());
    });

    /** Runs the use case with the mocked collaborators, applying the casts one time. */
    const run = (updateDto: UpdatePlatformSettingsDto): Promise<UpdatePlatformSettingsResult> =>
        updatePlatformSettingsUseCase(
            mockPlatformSettingsRepository as unknown as PlatformSettingsRepository,
            mockDnsResolver,
            mockPublicHostAddress,
            mockCloudflareRanges,
            mockControlPlaneEnvFile,
            updateDto,
        );

    it('delegates the write to the repository with the parameters of the operator', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledTimes(1);
        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: undefined,
        });
    });

    it('returns the parameters the repository keeps', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        const result = await run({ logRetentionDays: 45 });

        expect(result).toEqual({ logRetentionDays: 45, domainWarning: null });
    });

    it('returns no warning of the domain when the body carries no host', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        expect((await run({ logRetentionDays: 45 })).domainWarning).toBeNull();
    });

    it('returns no warning of the domain when the host points at this host', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        const result = await run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

        expect(result.domainWarning).toBeNull();
    });

    it('accepts the shortest age the platform allows', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 1 });

        await run({ logRetentionDays: 1 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({ logRetentionDays: 1 });
    });

    it('accepts the longest age the platform allows', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 365 });

        await run({ logRetentionDays: 365 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({ logRetentionDays: 365 });
    });

    it('throws an InvalidLogRetentionError when the age is below one day', async () => {
        await expect(run({ logRetentionDays: 0 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('throws an InvalidLogRetentionError when the age is above 365 days', async () => {
        await expect(run({ logRetentionDays: 366 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('throws an InvalidLogRetentionError when the age is no whole number', async () => {
        await expect(run({ logRetentionDays: 7.5 })).rejects.toBeInstanceOf(InvalidLogRetentionError);
    });

    it('never writes when the age falls outside the limits', async () => {
        await expect(run({ logRetentionDays: -1 })).rejects.toBeInstanceOf(InvalidLogRetentionError);

        expect(mockPlatformSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('writes the host of the control plane the administrator gives', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
        });

        await run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
        });
    });

    it('accepts a host of several labels', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45, gitpaasDomain: 'panel.gitpaas.co.uk' });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: 'panel.gitpaas.co.uk',
        });
    });

    it('clears the host of the control plane when the body carries none', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: undefined,
        });
    });

    it('writes the public address of the host the administrator gives', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({
            logRetentionDays: 45,
            publicHostAddress: '203.0.113.10',
        });

        await run({ logRetentionDays: 45, publicHostAddress: '203.0.113.10' });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: undefined,
            publicHostAddress: '203.0.113.10',
        });
    });

    it('writes an address of IPv6 as the public address of the host', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({
            logRetentionDays: 45,
            publicHostAddress: '2001:db8::1',
        });

        await run({ logRetentionDays: 45, publicHostAddress: '2001:db8::1' });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith(
            expect.objectContaining({ publicHostAddress: '2001:db8::1' }),
        );
    });

    it('clears the public address of the host when the body carries none', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledWith({
            logRetentionDays: 45,
            gitpaasDomain: undefined,
            publicHostAddress: undefined,
        });
    });

    it('throws an InvalidGitpaasDomainError when the host carries a single label', async () => {
        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'localhost' })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );
    });

    it('throws an InvalidGitpaasDomainError when a label ends with the hyphen', async () => {
        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas-.example.com' })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );
    });

    it('throws an InvalidGitpaasDomainError when the host carries a character the rule refuses', async () => {
        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'git paas.example.com' })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );
    });

    it('throws an InvalidGitpaasDomainError when the host runs past 253 characters', async () => {
        const host = `${'a'.repeat(250)}.com`;

        await expect(run({ logRetentionDays: 45, gitpaasDomain: host })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );
    });

    it('throws an InvalidGitpaasDomainError when the host is empty', async () => {
        await expect(run({ logRetentionDays: 45, gitpaasDomain: '' })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );
    });

    it('never writes when the host breaks the rule of a host name', async () => {
        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'localhost' })).rejects.toBeInstanceOf(
            InvalidGitpaasDomainError,
        );

        expect(mockPlatformSettingsRepository.save).not.toHaveBeenCalled();
    });

    it('checks the age of a log before the host of the control plane', async () => {
        await expect(run({ logRetentionDays: 0, gitpaasDomain: 'localhost' })).rejects.toBeInstanceOf(
            InvalidLogRetentionError,
        );
    });

    it('checks the host of the control plane with the resolver and the address of this host', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

        expect(mockCheckControlPlaneDomainUseCase).toHaveBeenCalledTimes(1);
        expect(mockCheckControlPlaneDomainUseCase).toHaveBeenCalledWith(
            mockDnsResolver,
            mockPublicHostAddress,
            mockCloudflareRanges,
            'gitpaas.example.com',
        );
    });

    it('never checks the host when the body carries none', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockCheckControlPlaneDomainUseCase).not.toHaveBeenCalled();
    });

    it('checks the host before it keeps the row', async () => {
        const order: string[] = [];
        // eslint-disable-next-line @typescript-eslint/require-await
        mockCheckControlPlaneDomainUseCase.mockImplementation(async () => {
            order.push('check');

            return domainCheck();
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockPlatformSettingsRepository.save.mockImplementation(async () => {
            order.push('save');

            return { logRetentionDays: 45 };
        });

        await run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

        expect(order).toEqual(['check', 'save']);
    });

    it('throws a GitpaasDomainNotPointingAtHostError when the host resolves elsewhere', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toBeInstanceOf(GitpaasDomainNotPointingAtHostError);
    });

    it('names the resolved address and the address of this host in the rejection', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toThrow(/gitpaas\.example\.com resolves to 198\.51\.100\.7.*answers on 203\.0\.113\.10/);
    });

    it('asks the operator for a confirmation in the rejection', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toThrow(/Confirm the domain/);
    });

    it('reports that the host resolves to no address when it resolves to none', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(
            failedCheck({ resolvedAddresses: [], reason: 'no-resolution' }),
        );

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toThrow(/resolves to no address/);
    });

    it('names the provider of the CDN in the rejection when the host resolves behind one', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(
            failedCheck({ resolvedAddresses: ['104.16.0.1'], provider: CLOUDFLARE_PROVIDER_NAME, reason: 'cdn' }),
        );

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            // eslint-disable-next-line security/detect-non-literal-regexp
            .toThrow(new RegExp(CLOUDFLARE_PROVIDER_NAME));
    });

    it('throws a HostAddressUnknownError when the address of this host cannot be read', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(
            failedCheck({ hostAddress: null, reason: 'host-address-unknown' }),
        );

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toBeInstanceOf(HostAddressUnknownError);
    });

    it('never keeps the row when the host does not point at this host', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toBeInstanceOf(GitpaasDomainNotPointingAtHostError);

        expect(mockPlatformSettingsRepository.save).not.toHaveBeenCalled();
        expect(mockControlPlaneEnvFile.writeDomain).not.toHaveBeenCalled();
    });

    it('keeps the row when the operator confirms the warning of the domain', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());
        mockPlatformSettingsRepository.save.mockResolvedValue({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
        });

        await run({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
            acknowledgeDomainWarning: true,
        });

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledTimes(1);
        expect(mockControlPlaneEnvFile.writeDomain).toHaveBeenCalledWith('gitpaas.example.com');
    });

    it('returns the warning of the domain when the operator confirms it', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());
        mockPlatformSettingsRepository.save.mockResolvedValue({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
        });

        const result = await run({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
            acknowledgeDomainWarning: true,
        });

        expect(result.domainWarning).toEqual({
            host: 'gitpaas.example.com',
            resolvedAddresses: ['198.51.100.7'],
            hostAddress: '203.0.113.10',
            reason: 'mismatch',
            provider: null,
            message: expect.any(String),
        });
    });

    it('keeps the row when the operator confirms an address of this host the platform ignores', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(
            failedCheck({ hostAddress: null, reason: 'host-address-unknown' }),
        );
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        const result = await run({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
            acknowledgeDomainWarning: true,
        });

        expect(result.domainWarning?.reason).toBe('host-address-unknown');
        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledTimes(1);
    });

    it('throws when the confirmation of the operator is false', async () => {
        mockCheckControlPlaneDomainUseCase.mockResolvedValue(failedCheck());

        await expect(run({
            logRetentionDays: 45,
            gitpaasDomain: 'gitpaas.example.com',
            acknowledgeDomainWarning: false,
        })).rejects.toBeInstanceOf(GitpaasDomainNotPointingAtHostError);
    });

    it('writes the host into the environment of the stack once the row is kept', async () => {
        const order: string[] = [];
        // eslint-disable-next-line @typescript-eslint/require-await
        mockPlatformSettingsRepository.save.mockImplementation(async () => {
            order.push('save');

            return { logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' };
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockControlPlaneEnvFile.writeDomain.mockImplementation(async () => {
            order.push('write');
        });

        await run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

        expect(mockControlPlaneEnvFile.writeDomain).toHaveBeenCalledTimes(1);
        expect(mockControlPlaneEnvFile.writeDomain).toHaveBeenCalledWith('gitpaas.example.com');
        expect(order).toEqual(['save', 'write']);
    });

    it('never writes the environment of the stack when the body carries no host', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });

        await run({ logRetentionDays: 45 });

        expect(mockControlPlaneEnvFile.writeDomain).not.toHaveBeenCalled();
    });

    it('throws a ControlPlaneEnvWriteError when the environment of the stack refuses the write', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });
        mockControlPlaneEnvFile.writeDomain.mockRejectedValue(new Error('EACCES'));

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toBeInstanceOf(ControlPlaneEnvWriteError);
    });

    it('names the file of the environment and keeps the failed write as the cause', async () => {
        const failure = new Error('EACCES');
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });
        mockControlPlaneEnvFile.writeDomain.mockRejectedValue(failure);

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toThrow(CONTROL_PLANE_ENV_PATH);
        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toMatchObject({ cause: failure });
    });

    it('keeps the row when the environment of the stack refuses the write', async () => {
        mockPlatformSettingsRepository.save.mockResolvedValue({ logRetentionDays: 45 });
        mockControlPlaneEnvFile.writeDomain.mockRejectedValue(new Error('EACCES'));

        await expect(run({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' })).rejects
            .toBeInstanceOf(ControlPlaneEnvWriteError);

        expect(mockPlatformSettingsRepository.save).toHaveBeenCalledTimes(1);
    });

    it('propagates errors thrown by the repository', async () => {
        const error = new Error('connection terminated');
        mockPlatformSettingsRepository.save.mockRejectedValue(error);

        await expect(run({ logRetentionDays: 30 })).rejects.toThrow(error);
    });
});
