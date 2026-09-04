import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { DbVolumeEntity } from './db-volume.entity';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Service volumes database entity, which mounts a volume inside one service of the Compose file.
 */
@Entity('service_volumes')
export class DbServiceVolumeEntity {
    @PrimaryColumn('uuid')
    public serviceId!: string;

    @PrimaryColumn('uuid')
    public volumeId!: string;

    @Column('text')
    public containerPath!: string;

    @Column('boolean', { default: false })
    public readOnly!: boolean;

    @Column('text')
    public composeServiceName!: string;

    @ManyToOne(() => DbServiceEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serviceId', foreignKeyConstraintName: 'FK_service_volumes_serviceId' })
    public service?: DbServiceEntity;

    @ManyToOne(() => DbVolumeEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volumeId', foreignKeyConstraintName: 'FK_service_volumes_volumeId' })
    public volume?: DbVolumeEntity;
}
