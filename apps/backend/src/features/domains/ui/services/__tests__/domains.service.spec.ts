import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { Test } from '@nestjs/testing';

import { claimDomainUseCase } from '../../../application/claim-domain.use-case';
import { getDomainsByServiceUseCase } from '../../../application/get-domains-by-service.use-case';
import { removeDomainUseCase } from '../../../application/remove-domain.use-case';
import { updateDomainUseCase } from '../../../application/update-domain.use-case';
import { Domain } from '../../../domain/models/domain.models';
import { DatabaseDomainsRepository } from '../../../infrastructure/database/db-domains.repository';
import { DomainsService } from '../domains.service';

jest.mock('../../../application/claim-domain.use-case');
jest.mock('../../../application/get-domains-by-service.use-case');
jest.mock('../../../application/remove-domain.use-case');
jest.mock('../../../application/update-domain.use-case');

const mockClaimDomainUseCase = claimDomainUseCase as jest.MockedFunction<typeof claimDomainUseCase>;
const mockGetDomainsByServiceUseCase = getDomainsByServiceUseCase as jest.MockedFunction<
    typeof getDomainsByServiceUseCase
>;
const mockRemoveDomainUseCase = removeDomainUseCase as jest.MockedFunction<typeof removeDomainUseCase>;
const mockUpdateDomainUseCase = updateDomainUseCase as jest.MockedFunction<typeof updateDomainUseCase>;

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const domainId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

const domain: Domain = {
    id: domainId,
    serviceId,
    host: 'app.example.com',
    targetService: 'web',
    port: 8080,
    https: true,
    certificateState: 'ready',
    certificateError: null,
};

describe('DomainsService', () => {
    let mockDomainsRepository: jest.Mocked<DatabaseDomainsRepository>;
    let sut: DomainsService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDomainsRepository = {} as jest.Mocked<DatabaseDomainsRepository>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                DomainsService,
                { provide: DatabaseDomainsRepository, useValue: mockDomainsRepository },
            ],
        }).compile();

        sut = moduleRef.get(DomainsService);
    });

    describe('getByService', () => {
        it('delegates to the use case with the repository and the service id', async () => {
            mockGetDomainsByServiceUseCase.mockResolvedValue([domain]);

            await sut.getByService(serviceId);

            expect(mockGetDomainsByServiceUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetDomainsByServiceUseCase).toHaveBeenCalledWith(mockDomainsRepository, serviceId);
        });

        it('returns the domains that the use case gives', async () => {
            mockGetDomainsByServiceUseCase.mockResolvedValue([domain]);

            expect(await sut.getByService(serviceId)).toEqual([domain]);
        });

        it('returns an empty list when the service holds no domain', async () => {
            mockGetDomainsByServiceUseCase.mockResolvedValue([]);

            expect(await sut.getByService(serviceId)).toEqual([]);
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('db unreachable');
            mockGetDomainsByServiceUseCase.mockRejectedValue(error);

            await expect(sut.getByService(serviceId)).rejects.toThrow(error);
        });
    });

    describe('claim', () => {
        const claimDto: ClaimDomainDto = {
            host: 'app.example.com',
            targetService: 'web',
            port: 8080,
            https: true,
        };

        it('delegates to the use case with the repository, the service id and the body', async () => {
            mockClaimDomainUseCase.mockResolvedValue(domain);

            await sut.claim(serviceId, claimDto);

            expect(mockClaimDomainUseCase).toHaveBeenCalledTimes(1);
            expect(mockClaimDomainUseCase).toHaveBeenCalledWith(
                mockDomainsRepository,
                serviceId,
                claimDto,
            );
        });

        it('returns the domain that the use case gives', async () => {
            mockClaimDomainUseCase.mockResolvedValue(domain);

            expect(await sut.claim(serviceId, claimDto)).toBe(domain);
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('host taken');
            mockClaimDomainUseCase.mockRejectedValue(error);

            await expect(sut.claim(serviceId, claimDto)).rejects.toThrow(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateDomainDto = { port: 9090 };

        it('delegates to the use case with the repository, the ids and the body', async () => {
            mockUpdateDomainUseCase.mockResolvedValue(domain);

            await sut.update(serviceId, domainId, updateDto);

            expect(mockUpdateDomainUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateDomainUseCase).toHaveBeenCalledWith(
                mockDomainsRepository,
                serviceId,
                domainId,
                updateDto,
            );
        });

        it('returns the domain that the use case gives', async () => {
            mockUpdateDomainUseCase.mockResolvedValue(domain);

            expect(await sut.update(serviceId, domainId, updateDto)).toBe(domain);
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('domain not found');
            mockUpdateDomainUseCase.mockRejectedValue(error);

            await expect(sut.update(serviceId, domainId, updateDto)).rejects.toThrow(error);
        });
    });

    describe('remove', () => {
        it('delegates to the use case with the repository and the ids', async () => {
            mockRemoveDomainUseCase.mockResolvedValue();

            await sut.remove(serviceId, domainId);

            expect(mockRemoveDomainUseCase).toHaveBeenCalledTimes(1);
            expect(mockRemoveDomainUseCase).toHaveBeenCalledWith(
                mockDomainsRepository,
                serviceId,
                domainId,
            );
        });

        it('returns nothing when the removal succeeds', async () => {
            mockRemoveDomainUseCase.mockResolvedValue();

            await expect(sut.remove(serviceId, domainId)).resolves.toBeUndefined();
        });

        it('propagates an error of the use case', async () => {
            const error = new Error('domain not found');
            mockRemoveDomainUseCase.mockRejectedValue(error);

            await expect(sut.remove(serviceId, domainId)).rejects.toThrow(error);
        });
    });
});
