import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { CertificateState } from '../../domain/models/domain.models';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Domains database entity.
 */
@Entity('domains')
@Unique('UQ_domains_host', ['host'])
export class DbDomainEntity {
    @PrimaryGeneratedColumn('uuid')
    public id!: string;

    @Column('uuid')
    public serviceId!: string;

    @Column('text')
    public host!: string;

    @Column('text')
    public targetService!: string;

    @Column('int')
    public port!: number;

    @Column({ type: 'boolean', default: false })
    public https!: boolean;

    @Column({ type: 'text', default: 'none' })
    public certificateState!: CertificateState;

    @Column({ type: 'text', nullable: true })
    public certificateError!: string | null;

    @ManyToOne(() => DbServiceEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId', foreignKeyConstraintName: 'FK_domains_serviceId' })
    public service?: DbServiceEntity;
}
