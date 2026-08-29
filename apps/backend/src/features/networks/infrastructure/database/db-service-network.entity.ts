import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DbProjectNetworkEntity } from './db-project-network.entity';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Service networks database entity, which joins a service to a network of its project.
 */
@Entity('service_networks')
export class DbServiceNetworkEntity {
    @PrimaryColumn('uuid')
    public serviceId!: string;

    @PrimaryColumn('uuid')
    public networkId!: string;

    @ManyToOne(() => DbServiceEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId', foreignKeyConstraintName: 'FK_service_networks_serviceId' })
    public service?: DbServiceEntity;

    @ManyToOne(() => DbProjectNetworkEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'networkId', foreignKeyConstraintName: 'FK_service_networks_networkId' })
    public network?: DbProjectNetworkEntity;
}
