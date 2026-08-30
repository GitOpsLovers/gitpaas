import type { ClaimDomainDto, UpdateDomainDto } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CertificateState, Domain } from '../../domain/models/domain.models';
import { DomainsRepository } from '../../domain/repositories/domains.repository';

import { DbDomainEntity } from './db-domain.entity';
import { toDomain } from './db-domains.transformer';

/**
 * Domains database repository
 */
@Injectable()
export class DatabaseDomainsRepository implements DomainsRepository {
    constructor(
        @InjectRepository(DbDomainEntity)
        private readonly repository: Repository<DbDomainEntity>,
    ) {}

    public async getByService(serviceId: string): Promise<Domain[]> {
        const domains = await this.repository.find({
            where: { serviceId },
            order: { host: 'ASC' },
        });

        return domains.map(toDomain);
    }

    public async findById(id: string): Promise<Domain | null> {
        const domain = await this.repository.findOneBy({ id });

        if (!domain) {
            return null;
        }

        return toDomain(domain);
    }

    public async findByHost(host: string): Promise<Domain | null> {
        const domain = await this.repository.findOneBy({ host });

        if (!domain) {
            return null;
        }

        return toDomain(domain);
    }

    public async create(
        serviceId: string,
        claimDto: ClaimDomainDto,
        certificateState: CertificateState,
    ): Promise<Domain> {
        const domain = this.repository.create({
            serviceId,
            host: claimDto.host,
            targetService: claimDto.targetService,
            port: claimDto.port,
            https: claimDto.https,
            certificateState,
            certificateError: null,
        });

        const saved = await this.repository.save(domain);

        return toDomain(saved);
    }

    public async update(
        id: string,
        updateDto: UpdateDomainDto,
        certificateState?: CertificateState,
        certificateError: string | null = null,
    ): Promise<Domain | null> {
        const domain = await this.repository.findOneBy({ id });

        if (!domain) {
            return null;
        }

        this.repository.merge(domain, {
            ...(updateDto.host === undefined ? {} : { host: updateDto.host }),
            ...(updateDto.targetService === undefined ? {} : { targetService: updateDto.targetService }),
            ...(updateDto.port === undefined ? {} : { port: updateDto.port }),
            ...(updateDto.https === undefined ? {} : { https: updateDto.https }),
            ...(certificateState === undefined ? {} : { certificateState, certificateError }),
        });

        const saved = await this.repository.save(domain);

        return toDomain(saved);
    }

    public async delete(id: string): Promise<boolean> {
        const result = await this.repository.delete(id);

        return (result.affected ?? 0) > 0;
    }
}
